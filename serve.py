#!/usr/bin/env python3
"""Lokāls izstrādes serveris, kas atdarina GitHub Pages.

Atbalsta tīrās adreses bez .html un neļauj pārlūkam kešot failus.
Palaišana: python serve.py [ports]
"""

import os
import sys
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer

# Saknes mape ir šī faila mape, tāpēc darba mapei nav nozīmes
ROOT = os.path.dirname(os.path.abspath(__file__))
PORT = 5173


class PagesHandler(SimpleHTTPRequestHandler):
    """Pieprasījumam /foo atdod /foo.html, ja tāda faila nav."""

    def send_head(self):
        # Izstrādes laikā kešs tikai traucē, tāpēc 304 atbildes nav vajadzīgas
        del self.headers["If-Modified-Since"]
        del self.headers["If-None-Match"]

        # Mapes (un to index.html) apstrādā vecākklase — mēs tās neaiztiekam
        if not self.path.endswith("/"):
            local = self.translate_path(self.path)
            if not os.path.exists(local) and os.path.isfile(local + ".html"):
                self.path = self._add_html_suffix(self.path)

        return super().send_head()

    @staticmethod
    def _add_html_suffix(path):
        """Pievieno .html pirms ? vai #, lai vaicājuma daļa paliek neskarta."""
        cut = len(path)
        for mark in ("?", "#"):
            pos = path.find(mark)
            if pos != -1:
                cut = min(cut, pos)
        return path[:cut] + ".html" + path[cut:]

    def end_headers(self):
        self.send_header("Cache-Control", "no-store, max-age=0")
        super().end_headers()


def main():
    port = int(sys.argv[1]) if len(sys.argv) > 1 else PORT
    handler = partial(PagesHandler, directory=ROOT)
    with ThreadingHTTPServer(("127.0.0.1", port), handler) as httpd:
        print(f"rast — lokālais serveris: http://localhost:{port}")
        print("Apturēšana: Ctrl+C")
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\nApturēts.")


if __name__ == "__main__":
    main()
