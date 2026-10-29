
from pathlib import Path
from uuid import uuid4

from django.conf import settings
from django.shortcuts import render
from PIL import Image, ImageChops, ImageEnhance, ImageFilter, ImageOps


IMAGE_SIZE = (512, 512)
DIFFERENCE_THRESHOLD = 35


def index(request):
    context = {
        "pixel_difference": None,
        "before_url": None,
        "after_url": None,
        "result_url": None,
        "error": None,
    }

    if request.method == "POST":
        before_file = request.FILES.get("before_image")
        after_file = request.FILES.get("after_image")

        if not before_file or not after_file:
            context["error"] = (
                "Please upload both Before and After images."
            )
            return render(request, "index.html", context)

        try:
            upload_dir = Path(settings.MEDIA_ROOT) / "uploads"
            result_dir = Path(settings.MEDIA_ROOT) / "results"

            upload_dir.mkdir(parents=True, exist_ok=True)
            result_dir.mkdir(parents=True, exist_ok=True)

            # Open images, correct EXIF orientation and normalize size.
            with Image.open(before_file) as img:
                before = ImageOps.exif_transpose(img).convert("RGB")
                before = ImageOps.fit(before, IMAGE_SIZE)

            with Image.open(after_file) as img:
                after = ImageOps.exif_transpose(img).convert("RGB")
                after = ImageOps.fit(after, IMAGE_SIZE)

            file_id = uuid4().hex

            before_name = f"before_{file_id}.jpg"
            after_name = f"after_{file_id}.jpg"
            result_name = f"changes_{file_id}.png"

            before_path = upload_dir / before_name
            after_path = upload_dir / after_name
            result_path = result_dir / result_name

            before.save(before_path, "JPEG", quality=95)
            after.save(after_path, "JPEG", quality=95)

            # Calculate pixel-level differences.
            difference = ImageChops.difference(before, after)
            difference = ImageEnhance.Contrast(difference).enhance(1.5)
            grayscale = difference.convert("L")
            grayscale = grayscale.filter(ImageFilter.MedianFilter(3))

            # Create binary mask of detected differences.
            mask = grayscale.point(
                lambda value: (
                    255 if value >= DIFFERENCE_THRESHOLD else 0
                )
            )

            total_pixels = IMAGE_SIZE[0] * IMAGE_SIZE[1]
            changed_pixels = mask.histogram()[255]

            pixel_difference = round(
                changed_pixels * 100 / total_pixels, 2
            )

            # Overlay flagged pixels in red on the After image.
            red_layer = Image.new("RGB", IMAGE_SIZE, (255, 0, 0))
            overlay = Image.blend(after, red_layer, 0.45)
            result = Image.composite(overlay, after, mask)
            result.save(result_path, "PNG")

            context.update({
                "pixel_difference": pixel_difference,
                "before_url": (
                    settings.MEDIA_URL + "uploads/" + before_name
                ),
                "after_url": (
                    settings.MEDIA_URL + "uploads/" + after_name
                ),
                "result_url": (
                    settings.MEDIA_URL + "results/" + result_name
                ),
            })

        except (OSError, ValueError):
            context["error"] = (
                "Unable to process the images. "
                "Please upload valid JPG, PNG or TIFF images."
            )

    return render(request, "index.html", context)
