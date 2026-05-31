"""
Anthill Raster Service.

Processes real raster pixels that the Node app cannot handle natively:

  1. Live multispectral alteration band ratios (Sentinel-2 L2A, ASTER L1T) from
     Microsoft Planetary Computer via rasterio - real surface mineralogy
     indicators (iron oxide, ferrous iron, clay/hydroxyl, vegetation stress).

  2. Potential-field derivatives on an operator-supplied magnetic or gravity
     GeoTIFF (the real airborne-survey workflow): reduction-style enhancement,
     analytic signal, tilt derivative, total horizontal gradient, vertical
     derivative, and multiscale edges ("worms").

No data is fabricated. If a source is unreachable the endpoint reports it.
"""

import io
import numpy as np
from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

import rasterio
from rasterio.warp import transform_bounds
from rasterio.windows import from_bounds
from scipy import ndimage

import planetary_computer as pc
from pystac_client import Client

app = FastAPI(title="Anthill Raster Service", version="1.0")
app.add_middleware(
    CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"]
)

STAC = "https://planetarycomputer.microsoft.com/api/stac/v1"

# Band assets per collection.
S2_BANDS = {"blue": "B02", "red": "B04", "nir": "B08", "rededge": "B8A", "swir1": "B11", "swir2": "B12"}


def _normalise(a):
    a = a.astype("float32")
    finite = np.isfinite(a)
    if not finite.any():
        return np.zeros_like(a)
    lo = np.nanpercentile(a[finite], 2)
    hi = np.nanpercentile(a[finite], 98)
    if hi - lo < 1e-9:
        return np.zeros_like(a)
    out = (a - lo) / (hi - lo)
    return np.clip(out, 0, 1)


def _read_band(item, asset, bbox, size):
    href = item.assets[asset].href
    with rasterio.open(href) as src:
        wb = transform_bounds("EPSG:4326", src.crs, *bbox)
        win = from_bounds(*wb, transform=src.transform)
        arr = src.read(1, window=win, out_shape=(size, size), boundless=True, fill_value=0).astype("float32")
    return arr


def _safe_ratio(a, b):
    return np.divide(a, b, out=np.zeros_like(a), where=b != 0)


class BandRatioReq(BaseModel):
    bbox: list  # [minlng, minlat, maxlng, maxlat]
    size: int = 48
    collection: str = "sentinel-2-l2a"
    max_cloud: float = 20.0
    year: int = 2024


@app.get("/health")
def health():
    caps = {"band_ratios": True, "derivatives": True}
    try:
        import rasterio as _r  # noqa
        caps["gdal"] = _r.__gdal_version__
    except Exception:
        caps["gdal"] = None
    return {"ok": True, "service": "anthill-raster", "capabilities": caps}


@app.post("/band-ratios")
def band_ratios(req: BandRatioReq):
    """Real alteration band ratios over an AOI from Sentinel-2 (or ASTER)."""
    bbox = req.bbox
    if len(bbox) != 4:
        raise HTTPException(400, "bbox must be [minlng, minlat, maxlng, maxlat]")
    try:
        cat = Client.open(STAC)
        search = cat.search(
            collections=[req.collection],
            bbox=bbox,
            datetime=f"{req.year}-01-01/{req.year}-12-31",
            query={"eo:cloud_cover": {"lt": req.max_cloud}},
            sortby=[{"field": "eo:cloud_cover", "direction": "asc"}],
            max_items=1,
        )
        items = list(search.items())
        if not items:
            return {"available": False, "reason": f"No {req.collection} scene under {req.max_cloud}% cloud for this AOI/year."}
        item = pc.sign(items[0])
        size = max(16, min(96, req.size))

        b = {k: _read_band(item, v, bbox, size) for k, v in S2_BANDS.items()}
        iron_oxide = _safe_ratio(b["red"], b["blue"])      # ferric iron / gossan
        ferrous = _safe_ratio(b["swir1"], b["rededge"])     # ferrous iron (canopy penetrating)
        clay = _safe_ratio(b["swir1"], b["swir2"])          # clay / hydroxyl alteration
        ndvi = _safe_ratio(b["nir"] - b["red"], b["nir"] + b["red"])
        veg_stress = 1.0 - _normalise(ndvi)                 # high = stressed vegetation

        def grid(a):
            return np.round(_normalise(a), 4).tolist()

        return {
            "available": True,
            "source": req.collection,
            "scene": item.id,
            "cloud_cover": item.properties.get("eo:cloud_cover"),
            "datetime": item.properties.get("datetime"),
            "size": size,
            "layers": {
                "iron_oxide": {"grid": grid(iron_oxide), "expr": "B04/B02", "detects": "Ferric iron / gossan caps"},
                "ferrous_iron": {"grid": grid(ferrous), "expr": "B11/B8A", "detects": "Ferrous iron under canopy"},
                "clay_alteration": {"grid": grid(clay), "expr": "B11/B12", "detects": "Clay / hydroxyl alteration"},
                "vegetation_stress": {"grid": grid(veg_stress), "expr": "1 - NDVI", "detects": "Geobotanical stress over mineralised soils"},
            },
        }
    except HTTPException:
        raise
    except Exception as e:  # noqa
        return {"available": False, "reason": f"Raster read failed: {type(e).__name__}: {str(e)[:200]}"}


# ---------- Potential-field derivatives (operator survey GeoTIFF) ----------

def _grad(a):
    gy, gx = np.gradient(a)
    return gx, gy


def potential_field_derivatives(field, cellsize=1.0):
    """Standard derivative products for magnetic/gravity grids."""
    field = field.astype("float64")
    field = np.where(np.isfinite(field), field, np.nanmean(field[np.isfinite(field)]) if np.isfinite(field).any() else 0.0)

    gx, gy = _grad(field)
    # Vertical derivative via FFT (dz ~ sqrt(kx^2+ky^2) in frequency domain)
    ny, nx = field.shape
    ky = np.fft.fftfreq(ny).reshape(-1, 1)
    kx = np.fft.fftfreq(nx).reshape(1, -1)
    k = np.sqrt(kx**2 + ky**2)
    F = np.fft.fft2(field - field.mean())
    vert = np.real(np.fft.ifft2(F * k))

    thg = np.sqrt(gx**2 + gy**2)                       # total horizontal gradient (edges)
    analytic = np.sqrt(gx**2 + gy**2 + vert**2)        # analytic signal (edge + depth)
    tilt = np.arctan2(vert, thg + 1e-9)                # tilt derivative (balances amplitudes)

    # Worms: ridges of the total horizontal gradient at increasing upward continuation.
    worms = np.zeros_like(field)
    for sigma in (1.0, 2.0, 4.0):
        cont = ndimage.gaussian_filter(field, sigma)   # upward continuation proxy
        cgx, cgy = _grad(cont)
        cthg = np.sqrt(cgx**2 + cgy**2)
        # local maxima of THG = structural edge
        mx = ndimage.maximum_filter(cthg, size=3)
        worms += (cthg >= mx - 1e-9) * cthg
    return {
        "tilt_derivative": tilt,
        "analytic_signal": analytic,
        "total_horizontal_gradient": thg,
        "vertical_derivative": vert,
        "worms": worms,
    }


def _norm_list(a, size=48):
    a = np.asarray(a, dtype="float64")
    # resample to size x size
    zoom = (size / a.shape[0], size / a.shape[1])
    a = ndimage.zoom(a, zoom, order=1)
    finite = np.isfinite(a)
    if not finite.any():
        return np.zeros((size, size)).tolist()
    lo, hi = np.nanpercentile(a[finite], 2), np.nanpercentile(a[finite], 98)
    if hi - lo < 1e-9:
        return np.zeros((size, size)).tolist()
    return np.round(np.clip((a - lo) / (hi - lo), 0, 1), 4).tolist()


@app.post("/derivatives")
async def derivatives(file: UploadFile = File(...), field_type: str = "magnetic", size: int = 48):
    """Compute potential-field derivatives from an uploaded magnetic/gravity GeoTIFF."""
    try:
        data = await file.read()
        with rasterio.open(io.BytesIO(data)) as src:
            arr = src.read(1).astype("float64")
            nodata = src.nodata
            if nodata is not None:
                arr = np.where(arr == nodata, np.nan, arr)
        if arr.size == 0:
            raise HTTPException(400, "Empty raster")
        derivs = potential_field_derivatives(arr)
        size = max(16, min(96, size))
        return {
            "available": True,
            "field_type": field_type,
            "source": file.filename,
            "size": size,
            "layers": {k: {"grid": _norm_list(v, size)} for k, v in derivs.items()},
            "note": "Real derivative products computed from the supplied survey grid.",
        }
    except HTTPException:
        raise
    except Exception as e:  # noqa
        return {"available": False, "reason": f"Could not process raster: {type(e).__name__}: {str(e)[:200]}"}
