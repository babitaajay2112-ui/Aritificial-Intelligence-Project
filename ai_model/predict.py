from PIL import Image, ImageChops, ImageEnhance, ImageOps


def compare_images(image_a, image_b, size=(512, 512)):
    """
    Basic image-difference prototype.

    image_a and image_b should be PIL Image objects.
    Returns the highlighted result and a pixel-difference percentage.
    """

    image_a = ImageOps.fit(
        image_a.convert("RGB"), size
    )

    image_b = ImageOps.fit(
        image_b.convert("RGB"), size
    )

    difference = ImageChops.difference(
        image_a, image_b
    )

    difference = ImageEnhance.Contrast(
        difference
    ).enhance(3.0)

    mask = ImageOps.grayscale(
        difference
    ).point(
        lambda pixel: 255 if pixel > 35 else 0
    )

    red = Image.new("RGB", size, (255, 40, 40))

    overlay = Image.blend(
        image_b, red, 0.48
    )

    result = Image.composite(
        overlay, image_b, mask
    )

    changed_pixels = sum(
        pixel > 0 for pixel in mask.getdata()
    )

    total_pixels = size[0] * size[1]

    percentage = round(
        changed_pixels / total_pixels * 100, 2
    )

    return result, percentage