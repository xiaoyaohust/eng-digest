#!/usr/bin/env python3
"""
Image Resizer Script
Resize images to specified dimensions

Usage:
    python resize_image.py input.png 48 48 output.png
    python resize_image.py input.png 128 128 output.png

Or run interactively:
    python resize_image.py
"""

import sys
import os
from pathlib import Path

try:
    from PIL import Image
except ImportError:
    print("❌ Pillow library not found!")
    print("Install it with: pip install Pillow")
    sys.exit(1)


def resize_image(input_file, width, height, output_file):
    """
    Resize an image to specified dimensions.

    Args:
        input_file: Path to input image
        width: Target width in pixels
        height: Target height in pixels
        output_file: Path to output image
    """
    try:
        # Check if input file exists
        if not os.path.exists(input_file):
            print(f"❌ Error: Input file '{input_file}' not found!")
            return False

        # Open image
        print(f"📷 Opening {input_file}...")
        img = Image.open(input_file)
        original_size = img.size
        print(f"   Original size: {original_size[0]}x{original_size[1]}")

        # Resize
        print(f"🔄 Resizing to {width}x{height}...")
        resized_img = img.resize((width, height), Image.Resampling.LANCZOS)

        # Save
        resized_img.save(output_file)
        file_size = os.path.getsize(output_file)
        print(f"✅ Saved to {output_file} ({file_size} bytes)")

        return True

    except Exception as e:
        print(f"❌ Error: {e}")
        return False


def interactive_mode():
    """Run in interactive mode."""
    print("\n" + "="*50)
    print("   Image Resizer - Interactive Mode")
    print("="*50 + "\n")

    # Get input file
    while True:
        input_file = input("Enter input file name: ").strip()
        if os.path.exists(input_file):
            break
        print(f"❌ File '{input_file}' not found. Try again.")

    # Get dimensions
    while True:
        try:
            width = int(input("Enter target width (pixels): ").strip())
            height = int(input("Enter target height (pixels): ").strip())
            if width > 0 and height > 0:
                break
            print("❌ Width and height must be positive numbers.")
        except ValueError:
            print("❌ Please enter valid numbers.")

    # Get output file
    default_output = f"{Path(input_file).stem}_{width}x{height}{Path(input_file).suffix}"
    output_file = input(f"Enter output file name [{default_output}]: ").strip()
    if not output_file:
        output_file = default_output

    # Confirm
    print("\n" + "-"*50)
    print(f"Input:  {input_file}")
    print(f"Size:   {width}x{height}")
    print(f"Output: {output_file}")
    print("-"*50)

    confirm = input("\nProceed? [Y/n]: ").strip().lower()
    if confirm in ['', 'y', 'yes']:
        resize_image(input_file, width, height, output_file)
    else:
        print("❌ Cancelled.")


def batch_mode(input_file, sizes, output_prefix=None):
    """
    Resize one image to multiple sizes.

    Args:
        input_file: Input image path
        sizes: List of (width, height) tuples
        output_prefix: Prefix for output files (default: "icon")
    """
    if not output_prefix:
        output_prefix = "icon"

    print(f"\n📦 Batch resizing {input_file} to {len(sizes)} sizes...\n")

    success_count = 0
    for width, height in sizes:
        output_file = f"{output_prefix}{width}.png"
        if resize_image(input_file, width, height, output_file):
            success_count += 1
        print()

    print(f"✅ Successfully created {success_count}/{len(sizes)} files")


def main():
    """Main function."""
    if len(sys.argv) == 1:
        # Interactive mode
        interactive_mode()

    elif len(sys.argv) == 5:
        # Command line mode: input width height output
        input_file = sys.argv[1]
        try:
            width = int(sys.argv[2])
            height = int(sys.argv[3])
            output_file = sys.argv[4]
            resize_image(input_file, width, height, output_file)
        except ValueError:
            print("❌ Error: Width and height must be numbers")
            sys.exit(1)

    elif len(sys.argv) == 2 and sys.argv[1] == '--batch':
        # Batch mode for extension icons
        print("\n🎯 Extension Icon Batch Mode\n")
        input_file = input("Enter source image (e.g., android-chrome-192x192.png): ").strip()

        if not os.path.exists(input_file):
            print(f"❌ File '{input_file}' not found!")
            sys.exit(1)

        sizes = [(16, 16), (32, 32), (48, 48), (128, 128)]
        batch_mode(input_file, sizes, output_prefix="icon")

    else:
        # Show usage
        print(__doc__)
        print("\nExamples:")
        print("  # Command line mode:")
        print("  python resize_image.py input.png 48 48 icon48.png")
        print("  python resize_image.py input.png 128 128 icon128.png")
        print()
        print("  # Interactive mode:")
        print("  python resize_image.py")
        print()
        print("  # Batch mode (create all 4 icon sizes):")
        print("  python resize_image.py --batch")
        sys.exit(1)


if __name__ == "__main__":
    main()
