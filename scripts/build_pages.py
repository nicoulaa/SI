#!/usr/bin/env python3
"""Prepare GitHub Pages files and a catalogue of the repository's Wplace overlays."""
import argparse
import json
from pathlib import Path
import shutil
import subprocess

ROOT = Path(__file__).resolve().parents[1]


def git_dates(relative):
    result = subprocess.run(
        ['git', 'log', '--follow', '--format=%ct', '--', relative],
        cwd=ROOT, check=True, capture_output=True, text=True,
    )
    dates = [int(line) * 1000 for line in result.stdout.splitlines() if line.strip()]
    return (dates[-1], dates[0]) if dates else (None, None)


def build(output):
    output = output.resolve()
    if output == ROOT or ROOT.is_relative_to(output) or output.is_relative_to(ROOT / 'Overlays') or output.is_relative_to(ROOT / 'Visionneuse'):
        raise ValueError('Choose an output directory separate from the source folders.')
    output.mkdir(parents=True, exist_ok=True)
    viewer = output / 'Visionneuse'
    viewer.mkdir(exist_ok=True)
    for name in ('index.html', 'style.css', 'app.js'):
        shutil.copy2(ROOT / 'Visionneuse' / name, viewer / name)

    entries = []
    overlays_root = ROOT / 'Overlays'
    if overlays_root.exists():
        for source in sorted(overlays_root.rglob('*')):
            if not source.is_file() or source.is_symlink() or source.suffix.lower() != '.wplace':
                continue
            relative = source.relative_to(ROOT)
            target = output / relative
            target.parent.mkdir(parents=True, exist_ok=True)
            shutil.copy2(source, target)
            created, modified = git_dates(relative.as_posix())
            entries.append({
                'path': relative.as_posix(),
                'size': source.stat().st_size,
                'created': created,
                'modified': modified,
            })

    catalogue = {'version': 1, 'files': entries}
    (viewer / 'catalogue.json').write_text(
        json.dumps(catalogue, ensure_ascii=False, indent=2), encoding='utf-8'
    )
    (output / 'index.html').write_text(
        '<!doctype html><html lang="fr"><meta charset="utf-8">'
        '<meta http-equiv="refresh" content="0;url=Visionneuse/">'
        '<title>SI · Visionneuse</title><a href="Visionneuse/">'
        'Ouvrir la visionneuse Wplace</a></html>', encoding='utf-8'
    )
    (output / '.nojekyll').touch()
    print(f'{len(entries)} overlays prepared in {output}')


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--output', type=Path, default=ROOT / '_site')
    build(parser.parse_args().output)
