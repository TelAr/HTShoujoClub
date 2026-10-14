"""
포스터·공지 이미지의 WebP 축소본 생성 도구

assets/img 안의 원본 이미지(.jpg/.jpeg/.png)마다 아래 두 파일을 만듭니다.
  <이름>-640.webp  : 목록(아카이브·홈 카드)용
  <이름>-840.webp  : 상세 페이지·공지 본문용
원본은 그대로 두며, 「원본 보기」 링크에서만 사용됩니다.
이미 최신 축소본이 있으면 건너뜁니다.

필요: Pillow  (python -m pip install --user pillow)
실행: python tools/make-webp.py          # 새로 추가·변경된 이미지만
      python tools/make-webp.py --force  # 전부 다시 생성
"""
import sys
from pathlib import Path

from PIL import Image, ImageOps

IMG_DIR = Path(__file__).resolve().parent.parent / "assets" / "img"
SIZES = (640, 840)  # 가로 폭(px). 원본이 더 작으면 원본 폭 그대로
QUALITY = 80
SOURCE_EXT = {".jpg", ".jpeg", ".png"}


def build(src: Path, force: bool) -> list[str]:
    results = []
    with Image.open(src) as im:
        im = ImageOps.exif_transpose(im)
        if im.mode not in ("RGB", "RGBA"):
            im = im.convert("RGBA" if "A" in im.getbands() else "RGB")
        for width in SIZES:
            dst = src.with_name(f"{src.stem}-{width}.webp")
            if not force and dst.exists() and dst.stat().st_mtime >= src.stat().st_mtime:
                results.append(f"  {dst.name}: 최신 (건너뜀)")
                continue
            w = min(width, im.width)
            h = round(im.height * w / im.width)
            resized = im.resize((w, h), Image.Resampling.LANCZOS) if w != im.width else im
            resized.save(dst, "WEBP", quality=QUALITY, method=6)
            results.append(f"  {dst.name}: {w}x{h}, {dst.stat().st_size / 1024:,.0f}KB")
    return results


def main() -> None:
    force = "--force" in sys.argv
    sources = sorted(p for p in IMG_DIR.iterdir() if p.suffix.lower() in SOURCE_EXT)
    if not sources:
        print("변환할 이미지가 없습니다.")
        return
    for src in sources:
        print(f"{src.name} ({src.stat().st_size / 1024:,.0f}KB)")
        for line in build(src, force):
            print(line)


if __name__ == "__main__":
    main()
