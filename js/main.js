((CAMPAIGN_LEVELS) => {
  'use strict';

  const FIELD_W = 10, FIELD_H = 18, R = 0.3;
  const GOAL_W = 2, GOAL_D = 1;
  const GOAL_TOP = 0.18; // deja visible la altura completa de la portería
  const COLORS = ['#38bdf8','#22d3ee','#22c55e','#eab308','#f97316','#ef4444','#a855f7','#ec4899','#f8fafc'];
  // Calibración común de golpeo v16.3.
  // Con fricción 2.1, una velocidad inicial cercana a 5.8 recorre aproximadamente 8 unidades
  // en línea recta sin colisiones: 4 franjas horizontales de 2 unidades.
  const SHOT_MAX_SPEED = 5.8;
  const SLING_MAX_PULL = 2.6;
  const cfg = { duration: 120, surface: 'grass', kickMode: 'sling', directionSpeed: 0.8 };

  const $ = id => document.getElementById(id);
  const canvas = $('game');
  const ctx = canvas.getContext('2d');
  let dpr=1, pxW=0, pxH=0, scale=1, ox=0, oy=0;

  
  const TOKEN_SVG_SOURCES = {
    A: "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNTYgMjU2IiB3aWR0aD0iMjU2IiBoZWlnaHQ9IjI1NiI+CiAgPGRlZnM+CiAgICA8cmFkaWFsR3JhZGllbnQgaWQ9InNoYWRvdyIgY3g9IjUwJSIgY3k9IjY0JSIgcj0iNTAlIj4KICAgICAgPHN0b3Agb2Zmc2V0PSIwJSIgc3RvcC1jb2xvcj0iIzAwMDAwMCIgc3RvcC1vcGFjaXR5PSIwLjUwIi8+CiAgICAgIDxzdG9wIG9mZnNldD0iNzAlIiBzdG9wLWNvbG9yPSIjMDAwMDAwIiBzdG9wLW9wYWNpdHk9IjAuMjQiLz4KICAgICAgPHN0b3Agb2Zmc2V0PSIxMDAlIiBzdG9wLWNvbG9yPSIjMDAwMDAwIiBzdG9wLW9wYWNpdHk9IjAiLz4KICAgIDwvcmFkaWFsR3JhZGllbnQ+CgogICAgPHJhZGlhbEdyYWRpZW50IGlkPSJtZXRhbE91dGVyIiBjeD0iMzElIiBjeT0iMjIlIiByPSI4NiUiPgogICAgICA8c3RvcCBvZmZzZXQ9IjAlIiBzdG9wLWNvbG9yPSIjZmZmZmZmIi8+CiAgICAgIDxzdG9wIG9mZnNldD0iMTIlIiBzdG9wLWNvbG9yPSIjZTVlN2ViIi8+CiAgICAgIDxzdG9wIG9mZnNldD0iMjYlIiBzdG9wLWNvbG9yPSIjOTRhM2I4Ii8+CiAgICAgIDxzdG9wIG9mZnNldD0iNDIlIiBzdG9wLWNvbG9yPSIjMWYyOTM3Ii8+CiAgICAgIDxzdG9wIG9mZnNldD0iNTYlIiBzdG9wLWNvbG9yPSIjMDIwNjE3Ii8+CiAgICAgIDxzdG9wIG9mZnNldD0iNzIlIiBzdG9wLWNvbG9yPSIjZjhmYWZjIi8+CiAgICAgIDxzdG9wIG9mZnNldD0iMTAwJSIgc3RvcC1jb2xvcj0iIzMzNDE1NSIvPgogICAgPC9yYWRpYWxHcmFkaWVudD4KCiAgICA8cmFkaWFsR3JhZGllbnQgaWQ9ImRhcmtSaW5nIiBjeD0iMzYlIiBjeT0iMjUlIiByPSI3NCUiPgogICAgICA8c3RvcCBvZmZzZXQ9IjAlIiBzdG9wLWNvbG9yPSIjNDc1NTY5Ii8+CiAgICAgIDxzdG9wIG9mZnNldD0iNDUlIiBzdG9wLWNvbG9yPSIjMTExODI3Ii8+CiAgICAgIDxzdG9wIG9mZnNldD0iNzglIiBzdG9wLWNvbG9yPSIjMDIwNjE3Ii8+CiAgICAgIDxzdG9wIG9mZnNldD0iMTAwJSIgc3RvcC1jb2xvcj0iIzFlMjkzYiIvPgogICAgPC9yYWRpYWxHcmFkaWVudD4KCiAgICA8bGluZWFyR3JhZGllbnQgaWQ9Im1ldGFsQmFuZCIgeDE9IjI4IiB5MT0iNDYiIHgyPSIyMjYiIHkyPSIyMTYiIGdyYWRpZW50VW5pdHM9InVzZXJTcGFjZU9uVXNlIj4KICAgICAgPHN0b3Agb2Zmc2V0PSIwJSIgc3RvcC1jb2xvcj0iI2ZmZmZmZiIvPgogICAgICA8c3RvcCBvZmZzZXQ9IjE2JSIgc3RvcC1jb2xvcj0iI2YxZjVmOSIvPgogICAgICA8c3RvcCBvZmZzZXQ9IjM2JSIgc3RvcC1jb2xvcj0iIzY0NzQ4YiIvPgogICAgICA8c3RvcCBvZmZzZXQ9IjU0JSIgc3RvcC1jb2xvcj0iIzAyMDYxNyIvPgogICAgICA8c3RvcCBvZmZzZXQ9IjcyJSIgc3RvcC1jb2xvcj0iI2UyZThmMCIvPgogICAgICA8c3RvcCBvZmZzZXQ9IjEwMCUiIHN0b3AtY29sb3I9IiM0NzU1NjkiLz4KICAgIDwvbGluZWFyR3JhZGllbnQ+CgogICAgPHJhZGlhbEdyYWRpZW50IGlkPSJwdXJwbGVCdXR0b24iIGN4PSIzNCUiIGN5PSIyMyUiIHI9IjgwJSI+CiAgICAgIDxzdG9wIG9mZnNldD0iMCUiIHN0b3AtY29sb3I9IiNmZmZmZmYiLz4KICAgICAgPHN0b3Agb2Zmc2V0PSIxMCUiIHN0b3AtY29sb3I9IiNmM2U4ZmYiLz4KICAgICAgPHN0b3Agb2Zmc2V0PSIzMiUiIHN0b3AtY29sb3I9IiNjMDg0ZmMiLz4KICAgICAgPHN0b3Agb2Zmc2V0PSI1OCUiIHN0b3AtY29sb3I9IiM5MzMzZWEiLz4KICAgICAgPHN0b3Agb2Zmc2V0PSI4NCUiIHN0b3AtY29sb3I9IiM1ODFjODciLz4KICAgICAgPHN0b3Agb2Zmc2V0PSIxMDAlIiBzdG9wLWNvbG9yPSIjMmUxMDY1Ii8+CiAgICA8L3JhZGlhbEdyYWRpZW50PgoKICAgIDxsaW5lYXJHcmFkaWVudCBpZD0ic2hpbmUiIHgxPSI0NSIgeTE9IjQyIiB4Mj0iMTY0IiB5Mj0iODYiIGdyYWRpZW50VW5pdHM9InVzZXJTcGFjZU9uVXNlIj4KICAgICAgPHN0b3Agb2Zmc2V0PSIwJSIgc3RvcC1jb2xvcj0iI2ZmZmZmZiIgc3RvcC1vcGFjaXR5PSIwLjg4Ii8+CiAgICAgIDxzdG9wIG9mZnNldD0iNTIlIiBzdG9wLWNvbG9yPSIjZmZmZmZmIiBzdG9wLW9wYWNpdHk9IjAuMjYiLz4KICAgICAgPHN0b3Agb2Zmc2V0PSIxMDAlIiBzdG9wLWNvbG9yPSIjZmZmZmZmIiBzdG9wLW9wYWNpdHk9IjAiLz4KICAgIDwvbGluZWFyR3JhZGllbnQ+CgogICAgPGZpbHRlciBpZD0icHVycGxlR2xvdyIgeD0iLTM1JSIgeT0iLTM1JSIgd2lkdGg9IjE3MCUiIGhlaWdodD0iMTcwJSI+CiAgICAgIDxmZUdhdXNzaWFuQmx1ciBzdGREZXZpYXRpb249IjUuNSIgcmVzdWx0PSJibHVyIi8+CiAgICAgIDxmZUNvbG9yTWF0cml4IGluPSJibHVyIiB0eXBlPSJtYXRyaXgiCiAgICAgICAgdmFsdWVzPSIwLjY2IDAgMCAwIDAuMzUKICAgICAgICAgICAgICAgIDAgMC4zNSAwIDAgMC4wOAogICAgICAgICAgICAgICAgMCAwIDEuMDAgMCAwLjgwCiAgICAgICAgICAgICAgICAwIDAgMCAwLjcyIDAiIHJlc3VsdD0iZ2xvdyIvPgogICAgICA8ZmVNZXJnZT4KICAgICAgICA8ZmVNZXJnZU5vZGUgaW49Imdsb3ciLz4KICAgICAgICA8ZmVNZXJnZU5vZGUgaW49IlNvdXJjZUdyYXBoaWMiLz4KICAgICAgPC9mZU1lcmdlPgogICAgPC9maWx0ZXI+CgogICAgPGZpbHRlciBpZD0ibGV0dGVyU2hhZG93IiB4PSItMzUlIiB5PSItMzUlIiB3aWR0aD0iMTcwJSIgaGVpZ2h0PSIxNzAlIj4KICAgICAgPGZlRHJvcFNoYWRvdyBkeD0iMCIgZHk9IjQiIHN0ZERldmlhdGlvbj0iMi40IiBmbG9vZC1jb2xvcj0iIzAyMDYxNyIgZmxvb2Qtb3BhY2l0eT0iMC43OCIvPgogICAgPC9maWx0ZXI+CiAgPC9kZWZzPgoKICA8IS0tIGZvbmRvIHRyYW5zcGFyZW50ZSByZWFsIC0tPgoKICA8IS0tIHNvbWJyYSBmw61zaWNhIG3DoXMgZ3JhbmRlIHkgc3VhdmUgLS0+CiAgPGVsbGlwc2UgY3g9IjEyOCIgY3k9IjE3MSIgcng9IjkzIiByeT0iNDIiIGZpbGw9InVybCgjc2hhZG93KSIvPgoKICA8IS0tIGN1ZXJwbyBtw6FzIGdyYW5kZTogbGEgZmljaGEgb2N1cGEgbcOhcyBkZWwgdmlld0JveCAtLT4KICA8Y2lyY2xlIGN4PSIxMjgiIGN5PSIxMjMiIHI9Ijk0IiBmaWxsPSIjYTg1NWY3IiBvcGFjaXR5PSIwLjExIiBmaWx0ZXI9InVybCgjcHVycGxlR2xvdykiLz4KICA8Y2lyY2xlIGN4PSIxMjgiIGN5PSIxMjIiIHI9IjkzIiBmaWxsPSJ1cmwoI21ldGFsT3V0ZXIpIi8+CiAgPGNpcmNsZSBjeD0iMTI4IiBjeT0iMTIyIiByPSI4NCIgZmlsbD0idXJsKCNkYXJrUmluZykiLz4KICA8Y2lyY2xlIGN4PSIxMjgiIGN5PSIxMjIiIHI9Ijc3IiBmaWxsPSJ1cmwoI21ldGFsQmFuZCkiLz4KCiAgPCEtLSBib3TDs24gY2VudHJhbCBtw6FzIGRvbWluYW50ZSAtLT4KICA8Y2lyY2xlIGN4PSIxMjgiIGN5PSIxMTUiIHI9IjcwIiBmaWxsPSJ1cmwoI3B1cnBsZUJ1dHRvbikiLz4KICA8Y2lyY2xlIGN4PSIxMjgiIGN5PSIxMTUiIHI9IjcxIiBmaWxsPSJub25lIiBzdHJva2U9IiNkOGI0ZmUiIHN0cm9rZS13aWR0aD0iNC4yIiBvcGFjaXR5PSIwLjkyIi8+CiAgPGNpcmNsZSBjeD0iMTI4IiBjeT0iMTE1IiByPSI2MSIgZmlsbD0ibm9uZSIgc3Ryb2tlPSIjZmZmZmZmIiBzdHJva2Utd2lkdGg9IjEuNiIgb3BhY2l0eT0iMC4zNiIvPgoKICA8IS0tIGFybyBleHRlcmlvciBtZW5vcyBkb21pbmFudGU6IG3DoXMgZGVsZ2FkbyB5IG1lbm9zIGJyaWxsYW50ZSAtLT4KICA8Y2lyY2xlIGN4PSIxMjgiIGN5PSIxMjIiIHI9Ijk0IiBmaWxsPSJub25lIiBzdHJva2U9IiNmZmZmZmYiIHN0cm9rZS13aWR0aD0iMS4zNSIgb3BhY2l0eT0iMC43MiIvPgogIDxjaXJjbGUgY3g9IjEyOCIgY3k9IjEyMiIgcj0iOTAiIGZpbGw9Im5vbmUiIHN0cm9rZT0iI2MwODRmYyIgc3Ryb2tlLXdpZHRoPSIxLjYiIG9wYWNpdHk9IjAuNTgiLz4KCiAgPCEtLSByZWZsZWpvIHN1cGVyaW9yIG3DoXMgbm90b3JpbyAtLT4KICA8ZWxsaXBzZSBjeD0iMTA1IiBjeT0iNzAiIHJ4PSI1MSIgcnk9IjIwIiBmaWxsPSJ1cmwoI3NoaW5lKSIgdHJhbnNmb3JtPSJyb3RhdGUoLTEyIDEwNSA3MCkiLz4KCiAgPCEtLSBib3JkZSBpbmZlcmlvciBwYXJhIGVmZWN0byBwdWNrIGdydWVzbyAtLT4KICA8cGF0aCBkPSJNNDEgMTMyIEM0OSAxODMsIDgzIDIxMSwgMTI4IDIxMSBDMTczIDIxMSwgMjA3IDE4MywgMjE1IDEzMgogICAgICAgICAgIEMyMDYgMTk1LCAxNzQgMjI4LCAxMjggMjI4IEM4MiAyMjgsIDUwIDE5NSwgNDEgMTMyWiIKICAgICAgICBmaWxsPSIjMmUxMDY1IiBvcGFjaXR5PSIwLjQ2Ii8+CiAgPHBhdGggZD0iTTQ5IDE3MSBDNzIgMjAyLCA5OCAyMTYsIDEyOCAyMTYgQzE1OCAyMTYsIDE4NCAyMDIsIDIwNyAxNzEiCiAgICAgICAgZmlsbD0ibm9uZSIgc3Ryb2tlPSIjYTg1NWY3IiBzdHJva2Utd2lkdGg9IjMiIG9wYWNpdHk9IjAuNDIiLz4KCiAgPCEtLSBsZXRyYSBBIG3DoXMgZ3JhbmRlIHkgbWVub3MgaHVuZGlkYSAtLT4KICA8dGV4dCB4PSIxMjgiIHk9IjE0MCIKICAgICAgICB0ZXh0LWFuY2hvcj0ibWlkZGxlIgogICAgICAgIGZvbnQtZmFtaWx5PSJBcmlhbCBCbGFjaywgQXJpYWwsIEhlbHZldGljYSwgc2Fucy1zZXJpZiIKICAgICAgICBmb250LXNpemU9Ijg4IgogICAgICAgIGZvbnQtd2VpZ2h0PSI5MDAiCiAgICAgICAgZmlsbD0iIzBmMTcyYSIKICAgICAgICBvcGFjaXR5PSIwLjQ2IgogICAgICAgIHRyYW5zZm9ybT0idHJhbnNsYXRlKDMgNCkiPkE8L3RleHQ+CgogIDx0ZXh0IHg9IjEyOCIgeT0iMTQwIgogICAgICAgIHRleHQtYW5jaG9yPSJtaWRkbGUiCiAgICAgICAgZm9udC1mYW1pbHk9IkFyaWFsIEJsYWNrLCBBcmlhbCwgSGVsdmV0aWNhLCBzYW5zLXNlcmlmIgogICAgICAgIGZvbnQtc2l6ZT0iODgiCiAgICAgICAgZm9udC13ZWlnaHQ9IjkwMCIKICAgICAgICBmaWxsPSIjZmZmZmZmIgogICAgICAgIHN0cm9rZT0iI2Y4ZmFmYyIKICAgICAgICBzdHJva2Utd2lkdGg9IjEuNiIKICAgICAgICBmaWx0ZXI9InVybCgjbGV0dGVyU2hhZG93KSI+QTwvdGV4dD4KPC9zdmc+Cg==",
    B: "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNTYgMjU2IiB3aWR0aD0iMjU2IiBoZWlnaHQ9IjI1NiI+CiAgPGRlZnM+CiAgICA8cmFkaWFsR3JhZGllbnQgaWQ9InNoYWRvdyIgY3g9IjUwJSIgY3k9IjY0JSIgcj0iNTAlIj4KICAgICAgPHN0b3Agb2Zmc2V0PSIwJSIgc3RvcC1jb2xvcj0iIzAwMDAwMCIgc3RvcC1vcGFjaXR5PSIwLjUwIi8+CiAgICAgIDxzdG9wIG9mZnNldD0iNzAlIiBzdG9wLWNvbG9yPSIjMDAwMDAwIiBzdG9wLW9wYWNpdHk9IjAuMjQiLz4KICAgICAgPHN0b3Agb2Zmc2V0PSIxMDAlIiBzdG9wLWNvbG9yPSIjMDAwMDAwIiBzdG9wLW9wYWNpdHk9IjAiLz4KICAgIDwvcmFkaWFsR3JhZGllbnQ+CgogICAgPHJhZGlhbEdyYWRpZW50IGlkPSJtZXRhbE91dGVyIiBjeD0iMzElIiBjeT0iMjIlIiByPSI4NiUiPgogICAgICA8c3RvcCBvZmZzZXQ9IjAlIiBzdG9wLWNvbG9yPSIjZmZmZmZmIi8+CiAgICAgIDxzdG9wIG9mZnNldD0iMTIlIiBzdG9wLWNvbG9yPSIjZTVlN2ViIi8+CiAgICAgIDxzdG9wIG9mZnNldD0iMjYlIiBzdG9wLWNvbG9yPSIjOTRhM2I4Ii8+CiAgICAgIDxzdG9wIG9mZnNldD0iNDIlIiBzdG9wLWNvbG9yPSIjMWYyOTM3Ii8+CiAgICAgIDxzdG9wIG9mZnNldD0iNTYlIiBzdG9wLWNvbG9yPSIjMDIwNjE3Ii8+CiAgICAgIDxzdG9wIG9mZnNldD0iNzIlIiBzdG9wLWNvbG9yPSIjZjhmYWZjIi8+CiAgICAgIDxzdG9wIG9mZnNldD0iMTAwJSIgc3RvcC1jb2xvcj0iIzMzNDE1NSIvPgogICAgPC9yYWRpYWxHcmFkaWVudD4KCiAgICA8cmFkaWFsR3JhZGllbnQgaWQ9ImRhcmtSaW5nIiBjeD0iMzYlIiBjeT0iMjUlIiByPSI3NCUiPgogICAgICA8c3RvcCBvZmZzZXQ9IjAlIiBzdG9wLWNvbG9yPSIjNDc1NTY5Ii8+CiAgICAgIDxzdG9wIG9mZnNldD0iNDUlIiBzdG9wLWNvbG9yPSIjMTExODI3Ii8+CiAgICAgIDxzdG9wIG9mZnNldD0iNzglIiBzdG9wLWNvbG9yPSIjMDIwNjE3Ii8+CiAgICAgIDxzdG9wIG9mZnNldD0iMTAwJSIgc3RvcC1jb2xvcj0iIzFlMjkzYiIvPgogICAgPC9yYWRpYWxHcmFkaWVudD4KCiAgICA8bGluZWFyR3JhZGllbnQgaWQ9Im1ldGFsQmFuZCIgeDE9IjI4IiB5MT0iNDYiIHgyPSIyMjYiIHkyPSIyMTYiIGdyYWRpZW50VW5pdHM9InVzZXJTcGFjZU9uVXNlIj4KICAgICAgPHN0b3Agb2Zmc2V0PSIwJSIgc3RvcC1jb2xvcj0iI2ZmZmZmZiIvPgogICAgICA8c3RvcCBvZmZzZXQ9IjE2JSIgc3RvcC1jb2xvcj0iI2YxZjVmOSIvPgogICAgICA8c3RvcCBvZmZzZXQ9IjM2JSIgc3RvcC1jb2xvcj0iIzY0NzQ4YiIvPgogICAgICA8c3RvcCBvZmZzZXQ9IjU0JSIgc3RvcC1jb2xvcj0iIzAyMDYxNyIvPgogICAgICA8c3RvcCBvZmZzZXQ9IjcyJSIgc3RvcC1jb2xvcj0iI2UyZThmMCIvPgogICAgICA8c3RvcCBvZmZzZXQ9IjEwMCUiIHN0b3AtY29sb3I9IiM0NzU1NjkiLz4KICAgIDwvbGluZWFyR3JhZGllbnQ+CgogICAgPHJhZGlhbEdyYWRpZW50IGlkPSJidXR0b25HcmFkIiBjeD0iMzQlIiBjeT0iMjMlIiByPSI4MCUiPgogICAgICA8c3RvcCBvZmZzZXQ9IjAlIiBzdG9wLWNvbG9yPSIjZmZmZmZmIi8+CiAgICAgIDxzdG9wIG9mZnNldD0iMTAlIiBzdG9wLWNvbG9yPSIjYmZkYmZlIi8+CiAgICAgIDxzdG9wIG9mZnNldD0iMzIlIiBzdG9wLWNvbG9yPSIjNjBhNWZhIi8+CiAgICAgIDxzdG9wIG9mZnNldD0iNTglIiBzdG9wLWNvbG9yPSIjMjU2M2ViIi8+CiAgICAgIDxzdG9wIG9mZnNldD0iODQlIiBzdG9wLWNvbG9yPSIjMWUzYThhIi8+CiAgICAgIDxzdG9wIG9mZnNldD0iMTAwJSIgc3RvcC1jb2xvcj0iIzAyMDYxNyIvPgogICAgPC9yYWRpYWxHcmFkaWVudD4KCiAgICA8bGluZWFyR3JhZGllbnQgaWQ9InNoaW5lIiB4MT0iNDUiIHkxPSI0MiIgeDI9IjE2NCIgeTI9Ijg2IiBncmFkaWVudFVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+CiAgICAgIDxzdG9wIG9mZnNldD0iMCUiIHN0b3AtY29sb3I9IiNmZmZmZmYiIHN0b3Atb3BhY2l0eT0iMC44OCIvPgogICAgICA8c3RvcCBvZmZzZXQ9IjUyJSIgc3RvcC1jb2xvcj0iI2ZmZmZmZiIgc3RvcC1vcGFjaXR5PSIwLjI2Ii8+CiAgICAgIDxzdG9wIG9mZnNldD0iMTAwJSIgc3RvcC1jb2xvcj0iI2ZmZmZmZiIgc3RvcC1vcGFjaXR5PSIwIi8+CiAgICA8L2xpbmVhckdyYWRpZW50PgoKICAgIDxmaWx0ZXIgaWQ9ImNvbG9yR2xvdyIgeD0iLTM1JSIgeT0iLTM1JSIgd2lkdGg9IjE3MCUiIGhlaWdodD0iMTcwJSI+CiAgICAgIDxmZUdhdXNzaWFuQmx1ciBzdGREZXZpYXRpb249IjUuNSIgcmVzdWx0PSJibHVyIi8+CiAgICAgIDxmZUZsb29kIGZsb29kLWNvbG9yPSIjNjBhNWZhIiBmbG9vZC1vcGFjaXR5PSIwLjcyIiByZXN1bHQ9Imdsb3dDb2xvciIvPgogICAgICA8ZmVDb21wb3NpdGUgaW49Imdsb3dDb2xvciIgaW4yPSJibHVyIiBvcGVyYXRvcj0iaW4iIHJlc3VsdD0iY29sb3JlZEdsb3ciLz4KICAgICAgPGZlTWVyZ2U+CiAgICAgICAgPGZlTWVyZ2VOb2RlIGluPSJjb2xvcmVkR2xvdyIvPgogICAgICAgIDxmZU1lcmdlTm9kZSBpbj0iU291cmNlR3JhcGhpYyIvPgogICAgICA8L2ZlTWVyZ2U+CiAgICA8L2ZpbHRlcj4KCiAgICA8ZmlsdGVyIGlkPSJsZXR0ZXJTaGFkb3ciIHg9Ii0zNSUiIHk9Ii0zNSUiIHdpZHRoPSIxNzAlIiBoZWlnaHQ9IjE3MCUiPgogICAgICA8ZmVEcm9wU2hhZG93IGR4PSIwIiBkeT0iNCIgc3RkRGV2aWF0aW9uPSIyLjQiIGZsb29kLWNvbG9yPSIjMDIwNjE3IiBmbG9vZC1vcGFjaXR5PSIwLjc4Ii8+CiAgICA8L2ZpbHRlcj4KICA8L2RlZnM+CgogIDwhLS0gZm9uZG8gdHJhbnNwYXJlbnRlIHJlYWwgLS0+CgogIDxlbGxpcHNlIGN4PSIxMjgiIGN5PSIxNzEiIHJ4PSI5MyIgcnk9IjQyIiBmaWxsPSJ1cmwoI3NoYWRvdykiLz4KCiAgPGNpcmNsZSBjeD0iMTI4IiBjeT0iMTIzIiByPSI5NCIgZmlsbD0iIzYwYTVmYSIgb3BhY2l0eT0iMC4xMSIgZmlsdGVyPSJ1cmwoI2NvbG9yR2xvdykiLz4KICA8Y2lyY2xlIGN4PSIxMjgiIGN5PSIxMjIiIHI9IjkzIiBmaWxsPSJ1cmwoI21ldGFsT3V0ZXIpIi8+CiAgPGNpcmNsZSBjeD0iMTI4IiBjeT0iMTIyIiByPSI4NCIgZmlsbD0idXJsKCNkYXJrUmluZykiLz4KICA8Y2lyY2xlIGN4PSIxMjgiIGN5PSIxMjIiIHI9Ijc3IiBmaWxsPSJ1cmwoI21ldGFsQmFuZCkiLz4KCiAgPGNpcmNsZSBjeD0iMTI4IiBjeT0iMTE1IiByPSI3MCIgZmlsbD0idXJsKCNidXR0b25HcmFkKSIvPgogIDxjaXJjbGUgY3g9IjEyOCIgY3k9IjExNSIgcj0iNzEiIGZpbGw9Im5vbmUiIHN0cm9rZT0iI2JmZGJmZSIgc3Ryb2tlLXdpZHRoPSI0LjIiIG9wYWNpdHk9IjAuOTIiLz4KICA8Y2lyY2xlIGN4PSIxMjgiIGN5PSIxMTUiIHI9IjYxIiBmaWxsPSJub25lIiBzdHJva2U9IiNmZmZmZmYiIHN0cm9rZS13aWR0aD0iMS42IiBvcGFjaXR5PSIwLjM2Ii8+CgogIDxjaXJjbGUgY3g9IjEyOCIgY3k9IjEyMiIgcj0iOTQiIGZpbGw9Im5vbmUiIHN0cm9rZT0iI2ZmZmZmZiIgc3Ryb2tlLXdpZHRoPSIxLjM1IiBvcGFjaXR5PSIwLjcyIi8+CiAgPGNpcmNsZSBjeD0iMTI4IiBjeT0iMTIyIiByPSI5MCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSIjNjBhNWZhIiBzdHJva2Utd2lkdGg9IjEuNiIgb3BhY2l0eT0iMC41OCIvPgoKICA8ZWxsaXBzZSBjeD0iMTA1IiBjeT0iNzAiIHJ4PSI1MSIgcnk9IjIwIiBmaWxsPSJ1cmwoI3NoaW5lKSIgdHJhbnNmb3JtPSJyb3RhdGUoLTEyIDEwNSA3MCkiLz4KCiAgPHBhdGggZD0iTTQxIDEzMiBDNDkgMTgzLCA4MyAyMTEsIDEyOCAyMTEgQzE3MyAyMTEsIDIwNyAxODMsIDIxNSAxMzIKICAgICAgICAgICBDMjA2IDE5NSwgMTc0IDIyOCwgMTI4IDIyOCBDODIgMjI4LCA1MCAxOTUsIDQxIDEzMloiCiAgICAgICAgZmlsbD0iIzFlM2E4YSIgb3BhY2l0eT0iMC40NiIvPgogIDxwYXRoIGQ9Ik00OSAxNzEgQzcyIDIwMiwgOTggMjE2LCAxMjggMjE2IEMxNTggMjE2LCAxODQgMjAyLCAyMDcgMTcxIgogICAgICAgIGZpbGw9Im5vbmUiIHN0cm9rZT0iIzI1NjNlYiIgc3Ryb2tlLXdpZHRoPSIzIiBvcGFjaXR5PSIwLjQyIi8+CgogIDx0ZXh0IHg9IjEyOCIgeT0iMTQwIgogICAgICAgIHRleHQtYW5jaG9yPSJtaWRkbGUiCiAgICAgICAgZm9udC1mYW1pbHk9IkFyaWFsIEJsYWNrLCBBcmlhbCwgSGVsdmV0aWNhLCBzYW5zLXNlcmlmIgogICAgICAgIGZvbnQtc2l6ZT0iODgiCiAgICAgICAgZm9udC13ZWlnaHQ9IjkwMCIKICAgICAgICBmaWxsPSIjMGYxNzJhIgogICAgICAgIG9wYWNpdHk9IjAuNDYiCiAgICAgICAgdHJhbnNmb3JtPSJ0cmFuc2xhdGUoMyA0KSI+QjwvdGV4dD4KCiAgPHRleHQgeD0iMTI4IiB5PSIxNDAiCiAgICAgICAgdGV4dC1hbmNob3I9Im1pZGRsZSIKICAgICAgICBmb250LWZhbWlseT0iQXJpYWwgQmxhY2ssIEFyaWFsLCBIZWx2ZXRpY2EsIHNhbnMtc2VyaWYiCiAgICAgICAgZm9udC1zaXplPSI4OCIKICAgICAgICBmb250LXdlaWdodD0iOTAwIgogICAgICAgIGZpbGw9IiNmZmZmZmYiCiAgICAgICAgc3Ryb2tlPSIjZjhmYWZjIgogICAgICAgIHN0cm9rZS13aWR0aD0iMS42IgogICAgICAgIGZpbHRlcj0idXJsKCNsZXR0ZXJTaGFkb3cpIj5CPC90ZXh0Pgo8L3N2Zz4K",
    C: "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNTYgMjU2IiB3aWR0aD0iMjU2IiBoZWlnaHQ9IjI1NiI+CiAgPGRlZnM+CiAgICA8cmFkaWFsR3JhZGllbnQgaWQ9InNoYWRvdyIgY3g9IjUwJSIgY3k9IjY0JSIgcj0iNTAlIj4KICAgICAgPHN0b3Agb2Zmc2V0PSIwJSIgc3RvcC1jb2xvcj0iIzAwMDAwMCIgc3RvcC1vcGFjaXR5PSIwLjUwIi8+CiAgICAgIDxzdG9wIG9mZnNldD0iNzAlIiBzdG9wLWNvbG9yPSIjMDAwMDAwIiBzdG9wLW9wYWNpdHk9IjAuMjQiLz4KICAgICAgPHN0b3Agb2Zmc2V0PSIxMDAlIiBzdG9wLWNvbG9yPSIjMDAwMDAwIiBzdG9wLW9wYWNpdHk9IjAiLz4KICAgIDwvcmFkaWFsR3JhZGllbnQ+CgogICAgPHJhZGlhbEdyYWRpZW50IGlkPSJtZXRhbE91dGVyIiBjeD0iMzElIiBjeT0iMjIlIiByPSI4NiUiPgogICAgICA8c3RvcCBvZmZzZXQ9IjAlIiBzdG9wLWNvbG9yPSIjZmZmZmZmIi8+CiAgICAgIDxzdG9wIG9mZnNldD0iMTIlIiBzdG9wLWNvbG9yPSIjZTVlN2ViIi8+CiAgICAgIDxzdG9wIG9mZnNldD0iMjYlIiBzdG9wLWNvbG9yPSIjOTRhM2I4Ii8+CiAgICAgIDxzdG9wIG9mZnNldD0iNDIlIiBzdG9wLWNvbG9yPSIjMWYyOTM3Ii8+CiAgICAgIDxzdG9wIG9mZnNldD0iNTYlIiBzdG9wLWNvbG9yPSIjMDIwNjE3Ii8+CiAgICAgIDxzdG9wIG9mZnNldD0iNzIlIiBzdG9wLWNvbG9yPSIjZjhmYWZjIi8+CiAgICAgIDxzdG9wIG9mZnNldD0iMTAwJSIgc3RvcC1jb2xvcj0iIzMzNDE1NSIvPgogICAgPC9yYWRpYWxHcmFkaWVudD4KCiAgICA8cmFkaWFsR3JhZGllbnQgaWQ9ImRhcmtSaW5nIiBjeD0iMzYlIiBjeT0iMjUlIiByPSI3NCUiPgogICAgICA8c3RvcCBvZmZzZXQ9IjAlIiBzdG9wLWNvbG9yPSIjNDc1NTY5Ii8+CiAgICAgIDxzdG9wIG9mZnNldD0iNDUlIiBzdG9wLWNvbG9yPSIjMTExODI3Ii8+CiAgICAgIDxzdG9wIG9mZnNldD0iNzglIiBzdG9wLWNvbG9yPSIjMDIwNjE3Ii8+CiAgICAgIDxzdG9wIG9mZnNldD0iMTAwJSIgc3RvcC1jb2xvcj0iIzFlMjkzYiIvPgogICAgPC9yYWRpYWxHcmFkaWVudD4KCiAgICA8bGluZWFyR3JhZGllbnQgaWQ9Im1ldGFsQmFuZCIgeDE9IjI4IiB5MT0iNDYiIHgyPSIyMjYiIHkyPSIyMTYiIGdyYWRpZW50VW5pdHM9InVzZXJTcGFjZU9uVXNlIj4KICAgICAgPHN0b3Agb2Zmc2V0PSIwJSIgc3RvcC1jb2xvcj0iI2ZmZmZmZiIvPgogICAgICA8c3RvcCBvZmZzZXQ9IjE2JSIgc3RvcC1jb2xvcj0iI2YxZjVmOSIvPgogICAgICA8c3RvcCBvZmZzZXQ9IjM2JSIgc3RvcC1jb2xvcj0iIzY0NzQ4YiIvPgogICAgICA8c3RvcCBvZmZzZXQ9IjU0JSIgc3RvcC1jb2xvcj0iIzAyMDYxNyIvPgogICAgICA8c3RvcCBvZmZzZXQ9IjcyJSIgc3RvcC1jb2xvcj0iI2UyZThmMCIvPgogICAgICA8c3RvcCBvZmZzZXQ9IjEwMCUiIHN0b3AtY29sb3I9IiM0NzU1NjkiLz4KICAgIDwvbGluZWFyR3JhZGllbnQ+CgogICAgPHJhZGlhbEdyYWRpZW50IGlkPSJidXR0b25HcmFkIiBjeD0iMzQlIiBjeT0iMjMlIiByPSI4MCUiPgogICAgICA8c3RvcCBvZmZzZXQ9IjAlIiBzdG9wLWNvbG9yPSIjZmZmZmZmIi8+CiAgICAgIDxzdG9wIG9mZnNldD0iMTAlIiBzdG9wLWNvbG9yPSIjZmVjYWNhIi8+CiAgICAgIDxzdG9wIG9mZnNldD0iMzIlIiBzdG9wLWNvbG9yPSIjZjg3MTcxIi8+CiAgICAgIDxzdG9wIG9mZnNldD0iNTglIiBzdG9wLWNvbG9yPSIjZWY0NDQ0Ii8+CiAgICAgIDxzdG9wIG9mZnNldD0iODQlIiBzdG9wLWNvbG9yPSIjOTkxYjFiIi8+CiAgICAgIDxzdG9wIG9mZnNldD0iMTAwJSIgc3RvcC1jb2xvcj0iIzAyMDYxNyIvPgogICAgPC9yYWRpYWxHcmFkaWVudD4KCiAgICA8bGluZWFyR3JhZGllbnQgaWQ9InNoaW5lIiB4MT0iNDUiIHkxPSI0MiIgeDI9IjE2NCIgeTI9Ijg2IiBncmFkaWVudFVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+CiAgICAgIDxzdG9wIG9mZnNldD0iMCUiIHN0b3AtY29sb3I9IiNmZmZmZmYiIHN0b3Atb3BhY2l0eT0iMC44OCIvPgogICAgICA8c3RvcCBvZmZzZXQ9IjUyJSIgc3RvcC1jb2xvcj0iI2ZmZmZmZiIgc3RvcC1vcGFjaXR5PSIwLjI2Ii8+CiAgICAgIDxzdG9wIG9mZnNldD0iMTAwJSIgc3RvcC1jb2xvcj0iI2ZmZmZmZiIgc3RvcC1vcGFjaXR5PSIwIi8+CiAgICA8L2xpbmVhckdyYWRpZW50PgoKICAgIDxmaWx0ZXIgaWQ9ImNvbG9yR2xvdyIgeD0iLTM1JSIgeT0iLTM1JSIgd2lkdGg9IjE3MCUiIGhlaWdodD0iMTcwJSI+CiAgICAgIDxmZUdhdXNzaWFuQmx1ciBzdGREZXZpYXRpb249IjUuNSIgcmVzdWx0PSJibHVyIi8+CiAgICAgIDxmZUZsb29kIGZsb29kLWNvbG9yPSIjZjg3MTcxIiBmbG9vZC1vcGFjaXR5PSIwLjcyIiByZXN1bHQ9Imdsb3dDb2xvciIvPgogICAgICA8ZmVDb21wb3NpdGUgaW49Imdsb3dDb2xvciIgaW4yPSJibHVyIiBvcGVyYXRvcj0iaW4iIHJlc3VsdD0iY29sb3JlZEdsb3ciLz4KICAgICAgPGZlTWVyZ2U+CiAgICAgICAgPGZlTWVyZ2VOb2RlIGluPSJjb2xvcmVkR2xvdyIvPgogICAgICAgIDxmZU1lcmdlTm9kZSBpbj0iU291cmNlR3JhcGhpYyIvPgogICAgICA8L2ZlTWVyZ2U+CiAgICA8L2ZpbHRlcj4KCiAgICA8ZmlsdGVyIGlkPSJsZXR0ZXJTaGFkb3ciIHg9Ii0zNSUiIHk9Ii0zNSUiIHdpZHRoPSIxNzAlIiBoZWlnaHQ9IjE3MCUiPgogICAgICA8ZmVEcm9wU2hhZG93IGR4PSIwIiBkeT0iNCIgc3RkRGV2aWF0aW9uPSIyLjQiIGZsb29kLWNvbG9yPSIjMDIwNjE3IiBmbG9vZC1vcGFjaXR5PSIwLjc4Ii8+CiAgICA8L2ZpbHRlcj4KICA8L2RlZnM+CgogIDwhLS0gZm9uZG8gdHJhbnNwYXJlbnRlIHJlYWwgLS0+CgogIDxlbGxpcHNlIGN4PSIxMjgiIGN5PSIxNzEiIHJ4PSI5MyIgcnk9IjQyIiBmaWxsPSJ1cmwoI3NoYWRvdykiLz4KCiAgPGNpcmNsZSBjeD0iMTI4IiBjeT0iMTIzIiByPSI5NCIgZmlsbD0iI2Y4NzE3MSIgb3BhY2l0eT0iMC4xMSIgZmlsdGVyPSJ1cmwoI2NvbG9yR2xvdykiLz4KICA8Y2lyY2xlIGN4PSIxMjgiIGN5PSIxMjIiIHI9IjkzIiBmaWxsPSJ1cmwoI21ldGFsT3V0ZXIpIi8+CiAgPGNpcmNsZSBjeD0iMTI4IiBjeT0iMTIyIiByPSI4NCIgZmlsbD0idXJsKCNkYXJrUmluZykiLz4KICA8Y2lyY2xlIGN4PSIxMjgiIGN5PSIxMjIiIHI9Ijc3IiBmaWxsPSJ1cmwoI21ldGFsQmFuZCkiLz4KCiAgPGNpcmNsZSBjeD0iMTI4IiBjeT0iMTE1IiByPSI3MCIgZmlsbD0idXJsKCNidXR0b25HcmFkKSIvPgogIDxjaXJjbGUgY3g9IjEyOCIgY3k9IjExNSIgcj0iNzEiIGZpbGw9Im5vbmUiIHN0cm9rZT0iI2ZlY2FjYSIgc3Ryb2tlLXdpZHRoPSI0LjIiIG9wYWNpdHk9IjAuOTIiLz4KICA8Y2lyY2xlIGN4PSIxMjgiIGN5PSIxMTUiIHI9IjYxIiBmaWxsPSJub25lIiBzdHJva2U9IiNmZmZmZmYiIHN0cm9rZS13aWR0aD0iMS42IiBvcGFjaXR5PSIwLjM2Ii8+CgogIDxjaXJjbGUgY3g9IjEyOCIgY3k9IjEyMiIgcj0iOTQiIGZpbGw9Im5vbmUiIHN0cm9rZT0iI2ZmZmZmZiIgc3Ryb2tlLXdpZHRoPSIxLjM1IiBvcGFjaXR5PSIwLjcyIi8+CiAgPGNpcmNsZSBjeD0iMTI4IiBjeT0iMTIyIiByPSI5MCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSIjZjg3MTcxIiBzdHJva2Utd2lkdGg9IjEuNiIgb3BhY2l0eT0iMC41OCIvPgoKICA8ZWxsaXBzZSBjeD0iMTA1IiBjeT0iNzAiIHJ4PSI1MSIgcnk9IjIwIiBmaWxsPSJ1cmwoI3NoaW5lKSIgdHJhbnNmb3JtPSJyb3RhdGUoLTEyIDEwNSA3MCkiLz4KCiAgPHBhdGggZD0iTTQxIDEzMiBDNDkgMTgzLCA4MyAyMTEsIDEyOCAyMTEgQzE3MyAyMTEsIDIwNyAxODMsIDIxNSAxMzIKICAgICAgICAgICBDMjA2IDE5NSwgMTc0IDIyOCwgMTI4IDIyOCBDODIgMjI4LCA1MCAxOTUsIDQxIDEzMloiCiAgICAgICAgZmlsbD0iIzk5MWIxYiIgb3BhY2l0eT0iMC40NiIvPgogIDxwYXRoIGQ9Ik00OSAxNzEgQzcyIDIwMiwgOTggMjE2LCAxMjggMjE2IEMxNTggMjE2LCAxODQgMjAyLCAyMDcgMTcxIgogICAgICAgIGZpbGw9Im5vbmUiIHN0cm9rZT0iI2VmNDQ0NCIgc3Ryb2tlLXdpZHRoPSIzIiBvcGFjaXR5PSIwLjQyIi8+CgogIDx0ZXh0IHg9IjEyMyIgeT0iMTQwIgogICAgICAgIHRleHQtYW5jaG9yPSJtaWRkbGUiCiAgICAgICAgZm9udC1mYW1pbHk9IkFyaWFsIEJsYWNrLCBBcmlhbCwgSGVsdmV0aWNhLCBzYW5zLXNlcmlmIgogICAgICAgIGZvbnQtc2l6ZT0iODgiCiAgICAgICAgZm9udC13ZWlnaHQ9IjkwMCIKICAgICAgICBmaWxsPSIjMGYxNzJhIgogICAgICAgIG9wYWNpdHk9IjAuNDYiCiAgICAgICAgdHJhbnNmb3JtPSJ0cmFuc2xhdGUoMyA0KSI+QzwvdGV4dD4KCiAgPHRleHQgeD0iMTIzIiB5PSIxNDAiCiAgICAgICAgdGV4dC1hbmNob3I9Im1pZGRsZSIKICAgICAgICBmb250LWZhbWlseT0iQXJpYWwgQmxhY2ssIEFyaWFsLCBIZWx2ZXRpY2EsIHNhbnMtc2VyaWYiCiAgICAgICAgZm9udC1zaXplPSI4OCIKICAgICAgICBmb250LXdlaWdodD0iOTAwIgogICAgICAgIGZpbGw9IiNmZmZmZmYiCiAgICAgICAgc3Ryb2tlPSIjZjhmYWZjIgogICAgICAgIHN0cm9rZS13aWR0aD0iMS42IgogICAgICAgIGZpbHRlcj0idXJsKCNsZXR0ZXJTaGFkb3cpIj5DPC90ZXh0Pgo8L3N2Zz4K"
  };
  const tokenSprites = {};
  Object.entries(TOKEN_SVG_SOURCES).forEach(([key, src]) => {
    const img = new Image();
    img.src = src;
    tokenSprites[key] = img;
  });

  
  const GOAL_PREMIUM_SRC = "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCA1MjAgMjYwIj4KPGRlZnM+CiAgPGxpbmVhckdyYWRpZW50IGlkPSJwb3N0IiB4MT0iMCIgeTE9IjAiIHgyPSIxIiB5Mj0iMCI+CiAgICA8c3RvcCBvZmZzZXQ9IjAlIiBzdG9wLWNvbG9yPSIjZGJlNGVlIi8+CiAgICA8c3RvcCBvZmZzZXQ9IjI1JSIgc3RvcC1jb2xvcj0iI2ZmZmZmZiIvPgogICAgPHN0b3Agb2Zmc2V0PSI3MCUiIHN0b3AtY29sb3I9IiNhYWI4YzgiLz4KICAgIDxzdG9wIG9mZnNldD0iMTAwJSIgc3RvcC1jb2xvcj0iI2ZmZmZmZiIvPgogIDwvbGluZWFyR3JhZGllbnQ+CiAgPGZpbHRlciBpZD0ic2hhZG93Ij4KICAgIDxmZURyb3BTaGFkb3cgZHg9IjAiIGR5PSIzIiBzdGREZXZpYXRpb249IjMiIGZsb29kLW9wYWNpdHk9IjAuMzUiLz4KICA8L2ZpbHRlcj4KPC9kZWZzPgoKCjwhLS0gUmVkIG3DoXMgdmlzaWJsZSAtLT4KPHBvbHlnb24gcG9pbnRzPSI5Miw2NCA0MjgsNjQgNDcwLDExOCA0MjgsMTk2IDkyLDE5NiA1MiwxMTgiCiAgICAgICAgIGZpbGw9IiNlZWY1ZmYiIG9wYWNpdHk9IjAuMTAiCiAgICAgICAgIHN0cm9rZT0iIzhmYTNiYiIgc3Ryb2tlLXdpZHRoPSIyLjQiLz4KCjxnIG9wYWNpdHk9IjAuOTIiIHN0cm9rZT0iI2Q5ZTNlZSIgc3Ryb2tlLXdpZHRoPSIyLjQiPgogIDwhLS0gdmVydGljYWxlcyAtLT4KICA8bGluZSB4MT0iMTE4IiB5MT0iNjciIHgyPSIxMTgiIHkyPSIxOTMiLz4KICA8bGluZSB4MT0iMTQ2IiB5MT0iNjciIHgyPSIxNDYiIHkyPSIxOTMiLz4KICA8bGluZSB4MT0iMTc0IiB5MT0iNjciIHgyPSIxNzQiIHkyPSIxOTMiLz4KICA8bGluZSB4MT0iMjAyIiB5MT0iNjciIHgyPSIyMDIiIHkyPSIxOTMiLz4KICA8bGluZSB4MT0iMjMwIiB5MT0iNjciIHgyPSIyMzAiIHkyPSIxOTMiLz4KICA8bGluZSB4MT0iMjU4IiB5MT0iNjciIHgyPSIyNTgiIHkyPSIxOTMiLz4KICA8bGluZSB4MT0iMjg2IiB5MT0iNjciIHgyPSIyODYiIHkyPSIxOTMiLz4KICA8bGluZSB4MT0iMzE0IiB5MT0iNjciIHgyPSIzMTQiIHkyPSIxOTMiLz4KICA8bGluZSB4MT0iMzQyIiB5MT0iNjciIHgyPSIzNDIiIHkyPSIxOTMiLz4KICA8bGluZSB4MT0iMzcwIiB5MT0iNjciIHgyPSIzNzAiIHkyPSIxOTMiLz4KICA8bGluZSB4MT0iMzk4IiB5MT0iNjciIHgyPSIzOTgiIHkyPSIxOTMiLz4KCiAgPCEtLSBob3Jpem9udGFsZXMgLS0+CiAgPGxpbmUgeDE9Ijk0IiB5MT0iODYiIHgyPSI0MjYiIHkyPSI4NiIvPgogIDxsaW5lIHgxPSI5NCIgeTE9IjEwOCIgeDI9IjQyNiIgeTI9IjEwOCIvPgogIDxsaW5lIHgxPSI5NCIgeTE9IjEzMCIgeDI9IjQyNiIgeTI9IjEzMCIvPgogIDxsaW5lIHgxPSI5NCIgeTE9IjE1MiIgeDI9IjQyNiIgeTI9IjE1MiIvPgogIDxsaW5lIHgxPSI5NCIgeTE9IjE3NCIgeDI9IjQyNiIgeTI9IjE3NCIvPgo8L2c+Cgo8IS0tIHJlZCBwcm9mdW5kaWRhZCAtLT4KPGcgb3BhY2l0eT0iMC43NSIgc3Ryb2tlPSIjY2ZkOGUzIiBzdHJva2Utd2lkdGg9IjIiPgogIDxsaW5lIHgxPSI5MiIgeTE9IjY0IiB4Mj0iNTIiIHkyPSIxMTgiLz4KICA8bGluZSB4MT0iOTIiIHkxPSIxMDgiIHgyPSI3MCIgeTI9IjExOCIvPgogIDxsaW5lIHgxPSI5MiIgeTE9IjE5NiIgeDI9IjUyIiB5Mj0iMTE4Ii8+CgogIDxsaW5lIHgxPSI0MjgiIHkxPSI2NCIgeDI9IjQ3MCIgeTI9IjExOCIvPgogIDxsaW5lIHgxPSI0MjgiIHkxPSIxMDgiIHgyPSI0NTAiIHkyPSIxMTgiLz4KICA8bGluZSB4MT0iNDI4IiB5MT0iMTk2IiB4Mj0iNDcwIiB5Mj0iMTE4Ii8+CjwvZz4KCjwhLS0gYm9jYSAtLT4KPHJlY3QgeD0iOTIiIHk9IjY0IiB3aWR0aD0iMzM2IiBoZWlnaHQ9IjEzMiIKICAgICAgZmlsbD0ibm9uZSIgc3Ryb2tlPSIjZmZmZmZmIiBzdHJva2Utd2lkdGg9IjYiLz4KCjwhLS0gcG9zdGVzIHByb3RhZ29uaXN0YXMgcGVybyBtZW5vcyBkb21pbmFudGVzIC0tPgo8ZyBmaWx0ZXI9InVybCgjc2hhZG93KSI+CiAgPHJlY3QgeD0iNzIiIHk9IjQwIiB3aWR0aD0iMzc2IiBoZWlnaHQ9IjE4IiByeD0iOSIgZmlsbD0idXJsKCNwb3N0KSIvPgogIDxyZWN0IHg9IjczIiB5PSI0OCIgd2lkdGg9IjE4IiBoZWlnaHQ9IjE2NCIgcng9IjkiIGZpbGw9InVybCgjcG9zdCkiLz4KICA8cmVjdCB4PSI0MjkiIHk9IjQ4IiB3aWR0aD0iMTgiIGhlaWdodD0iMTY0IiByeD0iOSIgZmlsbD0idXJsKCNwb3N0KSIvPgo8L2c+Cjwvc3ZnPg==";
  const goalPremiumImage = new Image();
  goalPremiumImage.src = GOAL_PREMIUM_SRC;

  const state = {
    screen:'home', running:false, phase:'idle', showTri:false,
    lastTriangle:null,
    timeLeft:120, goals:0, fastestGoalTimes:{}, history:[], currentSeq:[],
    discs:[], selected:null, lastHit:null, allowedInitial:true, shot:null,
    drag:null, aimMode:'idle', aimAngle:0, aimAngleFixed:null, forceValue:0, forceDir:1, messageLock:false, ended:false, introZoom:false, introStart:0, introDuration:1550, goalGlowUntil:0, goalChainUntil:0, records: loadRecords(),
    sessionStart:0, attemptStart:0, lastAttemptIndex:null, lastCollisionSoundAt:0, passGlow:null, paintBursts:[], metaWorldIndex:0, gameMode:'goal', currentMetaWorld:1, currentMetaLevel:1, metaLevelKey:'1-1', metaStart:0, metaElapsed:0, metaDone:[false,false,false], metaBest: loadMetaBest(), metaSeenWorlds: loadMetaSeenWorlds(), totals:{passes:0,triangles:0,complexity:0,area:0,fouls:0}
  };

  window.state = state;
  window.cfg = cfg;
  window.FIELD_W = FIELD_W;
  window.FIELD_H = FIELD_H;
  window.R = R;
  window.GOAL_W = GOAL_W;
  window.GOAL_D = GOAL_D;
  window.GOAL_TOP = GOAL_TOP;

  document.querySelectorAll('[data-close]').forEach(b=>b.onclick=()=>hideModal(b.dataset.close));
  document.querySelectorAll('[data-back]').forEach(b=>b.onclick=()=>showScreen('home'));

  const PROFILE_CONFIRMED_KEY = 'tdg_player_nick_confirmed_v1';
  const PROFILE_REQUIRED_MSG = '⚠ Debes registrar un nick antes de jugar.';
  let profileEditMode = false;
  let profileToastTimer = null;

  function playerNickValue(id='playerNickInput'){
    return ($(id)?.value || '').trim();
  }
  function isPlayerNickValid(nick){
    return nick.length >= 2 && nick.length <= 16;
  }
  function currentPlayerProfile(){
    return DATA_PROVIDER.getPlayerProfile ? DATA_PROVIDER.getPlayerProfile() : { nick: '' };
  }
  function profileNick(profile=currentPlayerProfile()){
    return String(profile && profile.nick ? profile.nick : '').trim().slice(0,16);
  }
  function isPlayerNickConfirmed(profile=currentPlayerProfile()){
    const nick = profileNick(profile);
    return isPlayerNickValid(nick) && (localStorage.getItem(PROFILE_CONFIRMED_KEY) === 'true' || nick !== 'Jugador');
  }
  function markPlayerNickConfirmed(){
    localStorage.setItem(PROFILE_CONFIRMED_KEY, 'true');
  }
  function setProfileMessage(id, text){
    const msg = $(id);
    if(msg) msg.textContent = text || '';
  }
  function showProfileToast(text){
    const toast = $('profileToast');
    if(!toast) return;
    toast.textContent = text;
    toast.classList.add('show');
    clearTimeout(profileToastTimer);
    profileToastTimer = setTimeout(()=>toast.classList.remove('show'), 2400);
  }
  function syncProfileInputs(nick){
    ['playerNickInput','configNickInput'].forEach(id=>{
      const input = $(id);
      if(input && document.activeElement !== input) input.value = nick || '';
    });
  }
  function updatePlayerProfileGate(){
    const profile = currentPlayerProfile();
    const nick = profileNick(profile);
    const confirmed = isPlayerNickConfirmed(profile);
    const ready = confirmed && !profileEditMode;
    const homeInput = $('playerNickInput');
    const homeTyped = playerNickValue('playerNickInput');
    const configTyped = playerNickValue('configNickInput');

    const summary = $('profileSummary');
    const editor = $('profileEditor');
    const homeNick = $('homePlayerNick');
    if(homeNick) homeNick.textContent = nick;
    if(summary) summary.hidden = !ready;
    if(editor) editor.hidden = ready;

    if(homeInput && document.activeElement !== homeInput){
      homeInput.value = confirmed ? nick : '';
    }
    syncProfileInputs(confirmed ? nick : '');

    const homeInputValid = isPlayerNickValid(homeInput ? homeTyped : nick);
    const configInputValid = isPlayerNickValid($('configNickInput') ? configTyped : nick);
    const confirmBtn = $('confirmNickBtn');
    const saveProfileBtn = $('saveProfileBtn');
    if(confirmBtn) confirmBtn.disabled = !homeInputValid;
    if(saveProfileBtn) saveProfileBtn.disabled = !configInputValid;

    ['goalPlayBtn','metaBtn'].forEach(id=>{ const btn=$(id); if(btn) btn.disabled = !ready; });
    setProfileMessage('playerNickMsg', ready ? '' : (homeInputValid ? '' : PROFILE_REQUIRED_MSG));
    return ready;
  }
  function saveProfileNickFromInput(inputId, toastText, msgId){
    const nick = playerNickValue(inputId);
    if(!isPlayerNickValid(nick)){
      setProfileMessage(msgId, PROFILE_REQUIRED_MSG);
      updatePlayerProfileGate();
      const input = $(inputId);
      if(input) input.focus();
      return false;
    }
    DATA_PROVIDER.savePlayerProfile({ nick });
    markPlayerNickConfirmed();
    profileEditMode = false;
    syncProfileInputs(nick);
    setProfileMessage('playerNickMsg', '');
    setProfileMessage('configNickMsg', '');
    updatePlayerProfileGate();
    showProfileToast(toastText);
    return true;
  }
  function confirmHomeNick(){
    return saveProfileNickFromInput('playerNickInput', '✓ Nick guardado. Puedes cambiarlo desde Configuración.', 'playerNickMsg');
  }
  function saveConfigNick(){
    return saveProfileNickFromInput('configNickInput', '✓ Nick actualizado.', 'configNickMsg');
  }
  function requirePlayerNick(){
    if(updatePlayerProfileGate()) return true;
    profileEditMode = true;
    updatePlayerProfileGate();
    const input = $('playerNickInput');
    if(input) input.focus();
    return false;
  }
  function initPlayerProfileGate(){
    const profile = currentPlayerProfile();
    const confirmed = isPlayerNickConfirmed(profile);
    profileEditMode = !confirmed;
    syncProfileInputs(confirmed ? profileNick(profile) : '');

    const homeInput = $('playerNickInput');
    if(homeInput){
      homeInput.addEventListener('input', updatePlayerProfileGate);
      homeInput.addEventListener('keydown', e=>{ if(e.key === 'Enter'){ e.preventDefault(); confirmHomeNick(); } });
    }
    const configInput = $('configNickInput');
    if(configInput){
      configInput.addEventListener('input', updatePlayerProfileGate);
      configInput.addEventListener('keydown', e=>{ if(e.key === 'Enter'){ e.preventDefault(); saveConfigNick(); } });
    }
    if($('confirmNickBtn')) $('confirmNickBtn').onclick=confirmHomeNick;
    if($('saveProfileBtn')) $('saveProfileBtn').onclick=saveConfigNick;
    updatePlayerProfileGate();
  }

  if($('configBtn')) $('configBtn').onclick=()=>{ syncProfileInputs(isPlayerNickConfirmed() ? profileNick() : ''); setProfileMessage('configNickMsg',''); showScreen('config'); };
  if($('saveConfigBtn')) $('saveConfigBtn').onclick=()=>{cfg.duration=+$('duration').value; cfg.surface=$('surface').value; cfg.kickMode=$('kickMode').value; cfg.directionSpeed=+$('directionSpeed').value; showScreen('home'); updatePlayerProfileGate();};
  if($('aboutBtn')) $('aboutBtn').onclick=()=>showModal('aboutModal');
  if($('recordsBtn')) $('recordsBtn').onclick=()=>{renderRecords(); showModal('recordsModal');};
  if($('goalPlayBtn')) $('goalPlayBtn').onclick=()=>{ if(requirePlayerNick()) startGame(); };
  if($('metaBtn')) $('metaBtn').onclick=()=>{ if(!requirePlayerNick()) return; state.metaWorldIndex=0; renderMetaWorlds(); showScreen('metaScreen');};
  if($('metaBackBtn')) $('metaBackBtn').onclick=()=>showScreen('home');
  if($('endBtn')) $('endBtn').onclick=()=>{
    finishGame(true);
    if(state.gameMode==='meta'){ state.metaWorldIndex=Math.max(0,(state.currentMetaWorld||1)-1); renderMetaWorlds(); showScreen('metaScreen'); }
    else showScreen('home');
  };
  if($('triBtn')) $('triBtn').onclick=()=>{pulseBtn('triBtn'); state.showTri=!state.showTri; updateTriButton(); renderLegend();};
  if($('histBtn')) $('histBtn').onclick=()=>{pulseBtn('histBtn'); renderHistory(); showModal('historyModal');};
  if($('statsHistBtn')) $('statsHistBtn').onclick=()=>{hideModal('statsModal'); renderHistory(); showModal('historyModal');};
  if($('againBtn')) $('againBtn').onclick=()=>{hideModal('statsModal'); startGame();};
  if($('kickoffBtn')) $('kickoffBtn').onclick=()=>{pulseBtn('kickoffBtn'); playTone('restart'); kickoff(true);};
  if($('nextLevelBtn')) $('nextLevelBtn').onclick=()=>{pulseBtn('nextLevelBtn'); goToNextMetaLevel();};
  initPlayerProfileGate();

  function latestHistoryType(){
    const h = state.history && state.history.length ? state.history[state.history.length-1] : null;
    return h ? h.type : null;
  }
    function canShowNextLevel(){
    return state.gameMode === 'meta' && state.phase === 'ended' && latestHistoryType() === 'meta' && !!nextMetaTarget();
  }



  const META_WORLDS = CAMPAIGN_LEVELS.map(({title, name, shape, levels}) => ({
    title, name, shape, levels: levels.map(({n})=>({n, state:'locked'}))
  }));
  function isMetaWorldUnlocked(wi){
    if(wi <= 0) return true;
    const prevWorld = wi;
    const last = lastImplementedLevelInWorld(prevWorld);
    return !!(last && state.metaBest && state.metaBest[`${prevWorld}-${last.n}`]);
  }
  function loadMetaSeenWorlds(){try{return JSON.parse(localStorage.getItem('tdg_meta_seen_worlds_v1')||'{"1":true}')}catch{return {"1":true}}}
  function saveMetaSeenWorld(worldNumber){
    state.metaSeenWorlds = state.metaSeenWorlds || {"1":true};
    state.metaSeenWorlds[String(worldNumber)] = true;
    localStorage.setItem('tdg_meta_seen_worlds_v1', JSON.stringify(state.metaSeenWorlds));
  }

  function worldEmblem(shape){
    if (WORLD_ART && WORLD_ART[shape]) {
      return `<img class="worldArtImg" alt="" src="${WORLD_ART[shape]}">`;
    }
    const defs = `
      <defs>
        <radialGradient id="coinBlue" cx="35%" cy="28%" r="75%"><stop offset="0" stop-color="#ffffff"/><stop offset=".18" stop-color="#bfdbfe"/><stop offset=".58" stop-color="#3b82f6"/><stop offset="1" stop-color="#1e3a8a"/></radialGradient>
        <radialGradient id="coinRed" cx="35%" cy="28%" r="75%"><stop offset="0" stop-color="#ffffff"/><stop offset=".18" stop-color="#fecaca"/><stop offset=".58" stop-color="#ef4444"/><stop offset="1" stop-color="#7f1d1d"/></radialGradient>
        <radialGradient id="coinPurple" cx="35%" cy="28%" r="75%"><stop offset="0" stop-color="#ffffff"/><stop offset=".18" stop-color="#e9d5ff"/><stop offset=".58" stop-color="#a855f7"/><stop offset="1" stop-color="#581c87"/></radialGradient>
        <linearGradient id="goldLine" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff7ad"/><stop offset=".48" stop-color="#facc15"/><stop offset="1" stop-color="#b45309"/></linearGradient>
        <linearGradient id="metalWall" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#f8fafc"/><stop offset=".42" stop-color="#94a3b8"/><stop offset="1" stop-color="#334155"/></linearGradient>
        <linearGradient id="cyanPortal" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#67e8f9"/><stop offset=".55" stop-color="#22d3ee"/><stop offset="1" stop-color="#0891b2"/></linearGradient>
        <radialGradient id="magPortal" cx="50%" cy="50%" r="65%"><stop offset="0" stop-color="#fdf2f8"/><stop offset=".46" stop-color="#ec4899"/><stop offset="1" stop-color="#831843"/></radialGradient>
        <linearGradient id="copper" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fed7aa"/><stop offset=".38" stop-color="#f97316"/><stop offset="1" stop-color="#7c2d12"/></linearGradient>
        <filter id="glowY" x="-40%" y="-40%" width="180%" height="180%"><feGaussianBlur stdDeviation="3" result="b"/><feColorMatrix in="b" type="matrix" values="1 0 0 0 1  0 0.75 0 0 .65  0 0 0.05 0 0  0 0 0 .75 0" result="g"/><feMerge><feMergeNode in="g"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
        <filter id="glowC" x="-40%" y="-40%" width="180%" height="180%"><feGaussianBlur stdDeviation="4" result="b"/><feColorMatrix in="b" type="matrix" values="0 0 0 0 .08  0 .9 0 0 .75  0 0 1 0 .95  0 0 0 .78 0" result="g"/><feMerge><feMergeNode in="g"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
        <filter id="glowM" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="4" result="b"/><feColorMatrix in="b" type="matrix" values="1 0 0 0 .95  0 0 .8 0 .12  0 0 1 0 .65  0 0 0 .82 0" result="g"/><feMerge><feMergeNode in="g"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
      </defs>`;
    if(shape==='triangle') return `<svg class="worldEmblemSvg" viewBox="0 0 320 120" aria-hidden="true">${defs}
      <path d="M102 38 L218 38 L160 86 Z" fill="rgba(250,204,21,.08)" stroke="url(#goldLine)" stroke-width="5" filter="url(#glowY)"/>
      <line x1="102" y1="38" x2="218" y2="38" stroke="url(#goldLine)" stroke-width="7" stroke-linecap="round" filter="url(#glowY)"/>
      <line x1="102" y1="38" x2="160" y2="86" stroke="url(#goldLine)" stroke-width="5" stroke-linecap="round" opacity=".95"/>
      <line x1="218" y1="38" x2="160" y2="86" stroke="url(#goldLine)" stroke-width="5" stroke-linecap="round" opacity=".95"/>
      <circle cx="102" cy="38" r="24" fill="url(#coinBlue)" stroke="#e0f2fe" stroke-width="3"/>
      <circle cx="218" cy="38" r="24" fill="url(#coinRed)" stroke="#fee2e2" stroke-width="3"/>
      <circle cx="160" cy="86" r="24" fill="url(#coinPurple)" stroke="#f3e8ff" stroke-width="3"/>
      <circle cx="92" cy="27" r="7" fill="rgba(255,255,255,.86)"/><circle cx="208" cy="27" r="7" fill="rgba(255,255,255,.86)"/><circle cx="150" cy="75" r="7" fill="rgba(255,255,255,.86)"/>
    </svg>`;
    if(shape==='corridor') return `<svg class="worldEmblemSvg" viewBox="0 0 320 120" aria-hidden="true">${defs}
      <defs>
        <filter id="blueGoalGlow" x="-90%" y="-90%" width="280%" height="280%">
          <feGaussianBlur stdDeviation="5" result="b"/><feFlood flood-color="#38bdf8" flood-opacity=".86" result="c"/><feComposite in="c" in2="b" operator="in" result="g"/><feMerge><feMergeNode in="g"/><feMergeNode in="SourceGraphic"/></feMerge>
        </filter>
        <filter id="purpleGoalGlow" x="-90%" y="-90%" width="280%" height="280%">
          <feGaussianBlur stdDeviation="5" result="b"/><feFlood flood-color="#a855f7" flood-opacity=".86" result="c"/><feComposite in="c" in2="b" operator="in" result="g"/><feMerge><feMergeNode in="g"/><feMergeNode in="SourceGraphic"/></feMerge>
        </filter>
        <filter id="redGoalGlow" x="-90%" y="-90%" width="280%" height="280%">
          <feGaussianBlur stdDeviation="5" result="b"/><feFlood flood-color="#f87171" flood-opacity=".86" result="c"/><feComposite in="c" in2="b" operator="in" result="g"/><feMerge><feMergeNode in="g"/><feMergeNode in="SourceGraphic"/></feMerge>
        </filter>
      </defs>

      <g opacity=".82">
        <path d="M78 84 C78 68 78 55 78 39" fill="none" stroke="#38bdf8" stroke-width="4" stroke-linecap="round" stroke-dasharray="2 8" filter="url(#blueGoalGlow)"/>
        <path d="M160 84 C160 68 160 55 160 39" fill="none" stroke="#a855f7" stroke-width="4" stroke-linecap="round" stroke-dasharray="2 8" filter="url(#purpleGoalGlow)"/>
        <path d="M242 84 C242 68 242 55 242 39" fill="none" stroke="#f87171" stroke-width="4" stroke-linecap="round" stroke-dasharray="2 8" filter="url(#redGoalGlow)"/>
      </g>

      <g>
        <g filter="url(#blueGoalGlow)">
          <rect x="54" y="12" width="48" height="48" rx="4" fill="#f8fafc" stroke="#38bdf8" stroke-width="5"/>
          <rect x="54" y="12" width="24" height="24" fill="#f8fafc"/>
          <rect x="78" y="12" width="24" height="24" fill="#0f172a"/>
          <rect x="54" y="36" width="24" height="24" fill="#0f172a"/>
          <rect x="78" y="36" width="24" height="24" fill="#f8fafc"/>
          <rect x="54" y="12" width="48" height="48" rx="4" fill="none" stroke="#dbeafe" stroke-width="1.6" opacity=".88"/>
          <rect x="54" y="12" width="48" height="48" rx="4" fill="rgba(56,189,248,.16)"/>
        </g>

        <g filter="url(#purpleGoalGlow)">
          <rect x="136" y="12" width="48" height="48" rx="4" fill="#f8fafc" stroke="#a855f7" stroke-width="5"/>
          <rect x="136" y="12" width="24" height="24" fill="#f8fafc"/>
          <rect x="160" y="12" width="24" height="24" fill="#0f172a"/>
          <rect x="136" y="36" width="24" height="24" fill="#0f172a"/>
          <rect x="160" y="36" width="24" height="24" fill="#f8fafc"/>
          <rect x="136" y="12" width="48" height="48" rx="4" fill="none" stroke="#f3e8ff" stroke-width="1.6" opacity=".88"/>
          <rect x="136" y="12" width="48" height="48" rx="4" fill="rgba(168,85,247,.16)"/>
        </g>

        <g filter="url(#redGoalGlow)">
          <rect x="218" y="12" width="48" height="48" rx="4" fill="#f8fafc" stroke="#f87171" stroke-width="5"/>
          <rect x="218" y="12" width="24" height="24" fill="#f8fafc"/>
          <rect x="242" y="12" width="24" height="24" fill="#0f172a"/>
          <rect x="218" y="36" width="24" height="24" fill="#0f172a"/>
          <rect x="242" y="36" width="24" height="24" fill="#f8fafc"/>
          <rect x="218" y="12" width="48" height="48" rx="4" fill="none" stroke="#fee2e2" stroke-width="1.6" opacity=".88"/>
          <rect x="218" y="12" width="48" height="48" rx="4" fill="rgba(248,113,113,.16)"/>
        </g>

        <path d="M54 12h48v48H54zM136 12h48v48h-48zM218 12h48v48h-48z" fill="url(#shine)" opacity=".22"/>
      </g>

      <g>
        <circle cx="78" cy="88" r="19" fill="url(#coinBlue)" stroke="#e0f2fe" stroke-width="3.2"/>
        <circle cx="160" cy="88" r="19" fill="url(#coinPurple)" stroke="#f3e8ff" stroke-width="3.2"/>
        <circle cx="242" cy="88" r="19" fill="url(#coinRed)" stroke="#fee2e2" stroke-width="3.2"/>
        <circle cx="70" cy="79" r="5.5" fill="rgba(255,255,255,.86)"/>
        <circle cx="152" cy="79" r="5.5" fill="rgba(255,255,255,.86)"/>
        <circle cx="234" cy="79" r="5.5" fill="rgba(255,255,255,.86)"/>
      </g>
    </svg>`;
    if(shape==='painters') return `<svg class="worldEmblemSvg" viewBox="0 0 320 120" aria-hidden="true">${defs}
      <defs>
        <radialGradient id="paintCore" cx="35%" cy="25%" r="76%"><stop offset="0" stop-color="#ffffff"/><stop offset=".22" stop-color="#f8fafc"/><stop offset=".58" stop-color="#94a3b8"/><stop offset="1" stop-color="#0f172a"/></radialGradient>
        <filter id="paintGlow" x="-80%" y="-80%" width="260%" height="260%"><feGaussianBlur stdDeviation="5" result="b"/><feFlood flood-color="#f8fafc" flood-opacity=".60" result="c"/><feComposite in="c" in2="b" operator="in" result="g"/><feMerge><feMergeNode in="g"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
        <filter id="purpleSplash" x="-90%" y="-90%" width="280%" height="280%"><feGaussianBlur stdDeviation="4" result="b"/><feFlood flood-color="#a855f7" flood-opacity=".82" result="c"/><feComposite in="c" in2="b" operator="in" result="g"/><feMerge><feMergeNode in="g"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
        <filter id="blueSplash" x="-90%" y="-90%" width="280%" height="280%"><feGaussianBlur stdDeviation="4" result="b"/><feFlood flood-color="#38bdf8" flood-opacity=".82" result="c"/><feComposite in="c" in2="b" operator="in" result="g"/><feMerge><feMergeNode in="g"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
        <filter id="redSplash" x="-90%" y="-90%" width="280%" height="280%"><feGaussianBlur stdDeviation="4" result="b"/><feFlood flood-color="#f87171" flood-opacity=".82" result="c"/><feComposite in="c" in2="b" operator="in" result="g"/><feMerge><feMergeNode in="g"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
      </defs>

      <g opacity=".45">
        <path d="M160 58 L160 22" stroke="#a855f7" stroke-width="5" stroke-linecap="round" stroke-dasharray="1 9" filter="url(#purpleSplash)"/>
        <path d="M160 58 L88 88" stroke="#f87171" stroke-width="5" stroke-linecap="round" stroke-dasharray="1 9" filter="url(#redSplash)"/>
        <path d="M160 58 L232 88" stroke="#38bdf8" stroke-width="5" stroke-linecap="round" stroke-dasharray="1 9" filter="url(#blueSplash)"/>
      </g>

      <g filter="url(#purpleSplash)">
        <circle cx="160" cy="22" r="17" fill="url(#coinPurple)" stroke="#f3e8ff" stroke-width="3"/>
        <circle cx="151" cy="14" r="4.5" fill="rgba(255,255,255,.90)"/>
        <circle cx="188" cy="24" r="5" fill="#a855f7" opacity=".95"/>
        <circle cx="135" cy="31" r="4" fill="#d8b4fe" opacity=".88"/>
      </g>
      <g filter="url(#redSplash)">
        <circle cx="88" cy="88" r="17" fill="url(#coinRed)" stroke="#fee2e2" stroke-width="3"/>
        <circle cx="79" cy="80" r="4.5" fill="rgba(255,255,255,.90)"/>
        <circle cx="61" cy="82" r="5" fill="#f87171" opacity=".95"/>
        <circle cx="108" cy="106" r="4" fill="#fecaca" opacity=".88"/>
      </g>
      <g filter="url(#blueSplash)">
        <circle cx="232" cy="88" r="17" fill="url(#coinBlue)" stroke="#e0f2fe" stroke-width="3"/>
        <circle cx="223" cy="80" r="4.5" fill="rgba(255,255,255,.90)"/>
        <circle cx="259" cy="82" r="5" fill="#38bdf8" opacity=".95"/>
        <circle cx="212" cy="106" r="4" fill="#bfdbfe" opacity=".88"/>
      </g>

      <g filter="url(#paintGlow)">
        <circle cx="160" cy="60" r="34" fill="rgba(248,250,252,.12)" stroke="rgba(255,255,255,.32)" stroke-width="3"/>
        <circle cx="160" cy="60" r="25" fill="url(#paintCore)" stroke="#f8fafc" stroke-width="4"/>
        <circle cx="160" cy="60" r="16" fill="rgba(15,23,42,.72)" stroke="rgba(255,255,255,.20)" stroke-width="2"/>
        <path d="M148 51 C154 42 171 43 176 53" fill="none" stroke="rgba(255,255,255,.55)" stroke-width="4" stroke-linecap="round"/>
      </g>
    </svg>`;
    if(shape==='turn') return `<svg class="worldEmblemSvg" viewBox="0 0 320 120" aria-hidden="true">${defs}
      <path d="M93 24 V83 Q93 96 106 96 H218" fill="none" stroke="url(#cyanPortal)" stroke-width="16" stroke-linecap="round" stroke-linejoin="round" filter="url(#glowC)"/>
      <path d="M93 24 V83 Q93 96 106 96 H218" fill="none" stroke="rgba(255,255,255,.72)" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/>
      <path d="M218 96 L196 82 V110 Z" fill="#e0f2fe" filter="url(#glowC)"/>
      <circle cx="93" cy="24" r="18" fill="url(#coinPurple)" stroke="#f3e8ff" stroke-width="3"/>
    </svg>`;
    if(shape==='hole') return `<svg class="worldEmblemSvg" viewBox="0 0 320 120" aria-hidden="true">${defs}
      <rect x="44" y="24" width="232" height="72" rx="20" fill="rgba(255,255,255,.06)" stroke="rgba(255,255,255,.70)" stroke-width="4"/>
      <rect x="132" y="36" width="56" height="48" rx="11" fill="url(#copper)" stroke="#fed7aa" stroke-width="4" filter="url(#glowY)"/>
      <rect x="141" y="43" width="38" height="16" rx="7" fill="rgba(255,255,255,.28)"/>
    </svg>`;
    return `<svg class="worldEmblemSvg" viewBox="0 0 320 120" aria-hidden="true">${defs}
      <g filter="url(#glowC)">
        <line x1="71" y1="42" x2="249" y2="42" stroke="url(#cyanPortal)" stroke-width="9" stroke-linecap="round"/>
        <line x1="71" y1="55" x2="249" y2="55" stroke="url(#cyanPortal)" stroke-width="9" stroke-linecap="round" opacity=".82"/>
        <rect x="42" y="27" width="43" height="43" rx="11" transform="rotate(45 63.5 48.5)" fill="rgba(8,145,178,.18)" stroke="#67e8f9" stroke-width="6"/>
        <rect x="235" y="27" width="43" height="43" rx="11" transform="rotate(45 256.5 48.5)" fill="rgba(8,145,178,.18)" stroke="#67e8f9" stroke-width="6"/>
      </g>
      <g filter="url(#glowM)">
        <circle cx="160" cy="91" r="18" fill="rgba(236,72,153,.18)" stroke="#f9a8d4" stroke-width="6"/>
        <circle cx="160" cy="91" r="30" fill="none" stroke="#ec4899" stroke-width="5" opacity=".92"/>
      </g>
    </svg>`;
  }
  document.documentElement.setAttribute('data-campaign-levels-loaded', String(CAMPAIGN_LEVELS && CAMPAIGN_LEVELS.length));


    function startMetaLevel1(resetHistory=true){
    startMetaLevel(1, resetHistory);
  }


  function metaZone(){ return metaZones()[0]; }
  function metaZoneAcceptsDisc(z, id){
    const d=state.discs[id];
    if(!d || !z) return false;
    if(z.targetId!=null && z.targetId!==id) return false;
    if(z.requiredName && d.name !== z.requiredName) return false;
    return true;
  }
  const META_ACCEPT_TOL = 0.055; // tolerancia visual: evita rechazos por pocos píxeles fuera de la meta.
  function isDiscInMeta(id){
    const d=state.discs[id];
    const tol = META_ACCEPT_TOL;
    return metaZones().some(z=>metaZoneAcceptsDisc(z,id) && d.x-R>=z.left-tol && d.x+R<=z.right+tol && d.y-R>=z.top-tol && d.y+R<=z.bottom+tol);
  }
  function zoneContainingDisc(id){
    const d=state.discs[id];
    const tol = META_ACCEPT_TOL;
    return metaZones().find(z=>metaZoneAcceptsDisc(z,id) && d.x-R>=z.left-tol && d.x+R<=z.right+tol && d.y-R>=z.top-tol && d.y+R<=z.bottom+tol) || metaZones()[0];
  }

  function distPointSegment(px,py, ax,ay, bx,by){
    const vx=bx-ax, vy=by-ay;
    const len2=vx*vx+vy*vy || 1e-9;
    let t=((px-ax)*vx+(py-ay)*vy)/len2;
    t=Math.max(0, Math.min(1, t));
    const x=ax+vx*t, y=ay+vy*t;
    return Math.hypot(px-x, py-y);
  }
  function segmentIntersectsPaintPool(ax,ay,bx,by,p){
    // Muestreo robusto y barato para charcos C1 o rectangulares 2x1.
    // Usa la elipse visible con una tolerancia equivalente al radio de la ficha.
    const rx = (p.rx || p.r || 0.5) + R*0.55;
    const ry = (p.ry || p.r || 0.5) + R*0.55;
    const steps = Math.max(8, Math.ceil(Math.hypot(bx-ax, by-ay) / 0.12));
    for(let i=0;i<=steps;i++){
      const t=i/steps;
      const x=ax+(bx-ax)*t, y=ay+(by-ay)*t;
      const nx=(x-p.cx)/rx, ny=(y-p.cy)/ry;
      if(nx*nx + ny*ny <= 1) return true;
    }
    return false;
  }
  function checkPaintPools(prev){
    const pools=paintZones();
    if(!pools.length) return;
    for(const d of state.discs){
      if(state.gameMode==='meta' && state.metaDone[d.id]) continue;
      const before = prev && prev[d.id] ? prev[d.id] : {x:d.x,y:d.y};
      for(const p of pools){
        const hit = segmentIntersectsPaintPool(before.x,before.y,d.x,d.y,p);
        if(hit && (d.name !== p.name || d.color !== p.color)){
          d.name = p.name;
          d.color = p.color;
          state.paintBursts = state.paintBursts || [];
          state.paintBursts.push({x:p.cx,y:p.cy,color:p.color,t:performance.now(),discId:d.id});
          playTone('pass');
          setStatus('');
        }
      }
    }
  }
  function freezeDiscInMeta(id){
    const d=state.discs[id], z=zoneContainingDisc(id);
    d.vx=0; d.vy=0;
    d.x=Math.max(z.left+R, Math.min(z.right-R, d.x));
    d.y=Math.max(z.top+R, Math.min(z.bottom-R, d.y));
  }
  function markDiscMetaDone(id){
    if(id==null || state.metaDone[id]) return false;
    state.metaDone[id]=true;
    freezeDiscInMeta(id);
    return true;
  }
  function metaCount(){ return state.metaDone.filter(Boolean).length; }
  function isInitialShotActive(){ return !!(state.shot && state.shot.initial && state.shot.hitId === 0); }
  function initialContactCount(){
    if(!state.shot || !state.shot.initialTouched) return 0;
    return Object.values(state.shot.initialTouched).filter(Boolean).length;
  }
  function validateInitialMickeyShot(){
    if(!isInitialShotActive()) return null;
    if(initialContactCount() <= 0) return {ok:false, reason:'Saque inválido: la ficha A no empujó ninguna ficha del Mickey'};
    return {ok:true, metrics:{b:0,h:0,complexity:0,area:0,initial:true}, inter:null};
  }
function completeMetaLevel(){
    if(state.messageLock) return;
    state.messageLock=true;
    state.running=false;
    state.phase='ended';
    state.ended=true;
    const time=state.metaElapsed;
    const seq = JSON.parse(JSON.stringify(state.currentSeq));
    const metrics = summarizeSeq(seq);
    const levelKey = state.metaLevelKey || '1-1';
    const result = {time, metrics, seq, date:new Date().toLocaleDateString(), level:state.currentMetaLevel};
    saveMetaBest(levelKey, result);
    DATA_PROVIDER.addCampaignAttempt(levelKey, {...result, type:'meta', reason:`Meta ${state.currentMetaLevel||1} completada`});
    playTone('goal');
    showOverlay('goal','META');
    setStatus(`Meta completada en ${formatMetaTime(time)}.`);
    state.history.push({type:'meta', reason:`Meta ${state.currentMetaLevel||1} completada`, seq, metrics, time, duration:time, level:state.currentMetaLevel||1});
    state.lastAttemptIndex=state.history.length-1;
    updateActionButtons();
    renderMetaWorlds();
  }

  function startIntroZoom(){
    state.introZoom = true;
    state.introStart = performance.now();
    state.running = false;
    setStatus('');
    setTimeout(() => {
      state.introZoom = false;
      if(state.screen === 'gameScreen' && !state.ended){
        state.running = true;
        setStatus('');
      }
    }, state.introDuration);
  }

  function startGame(){
    state.gameMode='goal';
    state.running=true; state.ended=false; state.timeLeft=cfg.duration; state.goals=0; state.fastestGoalTimes={}; state.history=[];
    state.totals={passes:0,triangles:0,complexity:0,area:0,fouls:0};
    state.sessionStart=Date.now(); showScreen('gameScreen'); kickoff(false); startIntroZoom(); updateHud();
  }

  function kickoff(resumeClock){
    // En modo Gol, si el partido ya terminó por tiempo, el saque inicial no debe reactivar la cancha.
    if(state.gameMode==='goal' && state.ended && state.timeLeft <= 0){
      setStatus('⏱ Fin');
      updateActionButtons();
      return;
    }
    if(state.gameMode==='meta'){ startMetaLevel(state.currentMetaLevel || 1, false, state.currentMetaWorld || 1); return; }
    state.phase='aim'; state.messageLock=false; state.selected=null; state.drag=null; state.aimMode='idle'; state.aimAngleFixed=null; state.forceValue=0; state.forceDir=1; state.lastHit=null; state.shot=null;
    state.currentSeq=[]; state.showTri=false; state.paintBursts=[]; updateTriButton(); updateActionButtons();
    $('overlayMsg').className='overlayMsg'; $('redTint').className='redTint';
    state.attemptStart = cfg.duration - state.timeLeft;
    setupMickey(); recordTriangle();
    if(resumeClock) state.running=true;
    setStatus('');
    renderLegend();
  }

  function setupMickey(){
    // Arco arriba. Mickey abajo: una ficha atrás y dos fichas adelante.
    const cx = FIELD_W/2;
    const yBack = FIELD_H - 1.05;
    // Mickey correcto: una ficha atrás y dos adelante, tangentes.
    // Con radio R, los centros forman un triángulo equilátero de lado 2R.
    const halfSep = R;
    const yFront = yBack - Math.sqrt(3) * R;
    state.discs = [
      {id:0,x:cx,y:yBack,vx:0,vy:0,color:'#a855f7',name:'A'},
      {id:1,x:cx-halfSep,y:yFront,vx:0,vy:0,color:'#60a5fa',name:'B'},
      {id:2,x:cx+halfSep,y:yFront,vx:0,vy:0,color:'#f87171',name:'C'}
    ];
    state.allowedInitial=true;
  }


  function resize(){
    const box=$('canvasBox'); if(!box) return;
    dpr = Math.max(1, Math.min(3, window.devicePixelRatio||1));
    const bw = box.clientWidth-4, bh = box.clientHeight-4;
    const aspect = FIELD_W/FIELD_H;
    let cssW = Math.min(bw, bh*aspect), cssH = cssW/aspect;
    if(cssH>bh){cssH=bh; cssW=cssH*aspect;}
    canvas.style.width=cssW+'px'; canvas.style.height=cssH+'px';
    canvas.width=Math.round(cssW*dpr); canvas.height=Math.round(cssH*dpr);
    pxW=canvas.width; pxH=canvas.height;
    scale = pxW/FIELD_W; ox=0; oy=0;
  }
  window.addEventListener('resize', resize);

  function worldToScreen(p){return {x:ox+p.x*scale, y:oy+p.y*scale};}
  function screenToWorld(clientX,clientY){const r=canvas.getBoundingClientRect();return {x:(clientX-r.left)*dpr/scale, y:(clientY-r.top)*dpr/scale};}

  function tick(dt){
    if(state.screen==='gameScreen' && state.running && !state.ended){
      if(state.gameMode==='meta'){
        state.metaElapsed = (performance.now() - state.metaStart)/1000;
      } else {
        state.timeLeft -= dt;
        if(state.timeLeft<=0){state.timeLeft=0; finishGame(false);}
      }
      updateHud();
    }
    if(state.phase==='moving') physicsStep(dt);
    updateDirForceAim(dt);
    draw();
    requestAnimationFrame(loop);
  }
  let last=performance.now();
  function loop(now){const dt=Math.min(0.033,(now-last)/1000); last=now; tick(dt);}
  requestAnimationFrame(loop);

  function updateDirForceAim(dt){
    if(cfg.kickMode !== 'dirforce' || state.phase !== 'aim' || !state.running) return;
    if(state.aimMode === 'direction'){
      state.aimAngle += dt * Math.PI * cfg.directionSpeed;
      if(state.aimAngle > Math.PI*2) state.aimAngle -= Math.PI*2;
    } else if(state.aimMode === 'force'){
      state.forceValue += state.forceDir * dt * 1.35;
      if(state.forceValue >= 1){ state.forceValue = 1; state.forceDir = -1; }
      if(state.forceValue <= 0){ state.forceValue = 0; state.forceDir = 1; }
    }
  }

  function physicsStep(dt){
    const friction = 2.1;
    const was = state.discs.map(d=>({x:d.x,y:d.y}));
    for(const d of state.discs){
      if(state.gameMode==='meta' && state.metaDone[d.id]){
        freezeDiscInMeta(d.id);
        continue;
      }
      d.x += d.vx*dt; d.y += d.vy*dt;
      const speed=Math.hypot(d.vx,d.vy);
      const ns=Math.max(0, speed - friction*dt);
      if(speed>0){d.vx*=ns/speed; d.vy*=ns/speed;}
      if(ns<0.035){d.vx=0; d.vy=0;}
    }

    // Initial Mickey allowed push: simple, limited impulse transfer from back disc to front discs.
    if(state.allowedInitial){ handleInitialPush(); }

    checkPaintPools(was);

    // Meta/Gol se detectan antes que la salida por fondo.
    // Excepción: durante el saque inicial Mickey se valida primero que A haya empujado
    // al menos una ficha del Mickey; no se exige cruce de puerta en ese primer golpe.
    const movedNow = state.lastHit;
    const initialShot = isInitialShotActive();
    if(!initialShot && movedNow!=null && state.gameMode==='goal' && checkGoal(movedNow)){
      const validGoalPass = validateDoorPass(movedNow, state.lastStart);
      if(validGoalPass.ok){
        recordTriangle(movedNow, validGoalPass.metrics);
        endSequence('goal','Gol');
      } else {
        endSequence('foul', validGoalPass.reason || 'Gol inválido: no atravesó limpiamente la puerta');
      }
      return;
    }
    if(!initialShot && movedNow!=null && state.gameMode==='meta' && isDiscInMeta(movedNow)){
      if(markDiscMetaDone(movedNow)){
        recordTriangle(movedNow, {b:0,h:0,complexity:0,area:0,meta:true});
        playTone('pass');
      }
      updateHud();
      if(metaCount()>=3){ completeMetaLevel(); return; }
      state.phase='aim';
      setStatus('');
      return;
    }

    // v18.4: durante el saque inicial en modo Meta, si A ya empujó al menos
    // una ficha del Mickey y entra en META, se completa inmediatamente.
    // Esto evita que siga moviéndose y termine cobrando falta por salir luego.
    if(initialShot && movedNow!=null && state.gameMode==='meta' && isDiscInMeta(movedNow)){
      const valid = validateInitialMickeyShot();
      if(!valid.ok){
        endSequence('foul', valid.reason || 'Saque inicial inválido');
        return;
      }
      if(!state.shot.initialRecorded){
        recordTriangle(movedNow, valid.metrics);
        state.shot.initialRecorded = true;
      }
      if(markDiscMetaDone(movedNow)){
        recordTriangle(movedNow, {b:0,h:0,complexity:0,area:0,meta:true, initialMeta:true});
        playTone('pass');
      }
      cleanupAfterInitialMickeyShot();
      state.allowedInitial = false;
      updateHud();
      if(metaCount()>=3){ completeMetaLevel(); return; }
      state.phase='aim';
      setStatus('');
      return;
    }

    const foul = detectFoul();
    if(foul){ endSequence('foul', foul); return; }

    if(allStopped()){
      state.phase='aim';
      const movedId=state.lastHit;

      // Saque inicial Mickey: primero se valida que A haya empujado al menos
      // una ficha del Mickey. Si además A termina en META, cuenta como completada.
      if(initialShot){
        const valid = validateInitialMickeyShot();
        if(!valid.ok){
          endSequence('foul', valid.reason || 'Saque inicial inválido');
          return;
        }
        if(!state.shot.initialRecorded){
          recordTriangle(movedId, valid.metrics);
          state.shot.initialRecorded = true;
        }
        cleanupAfterInitialMickeyShot();
        state.allowedInitial = false;
        playTone('pass');

        if(state.gameMode==='meta' && movedId!=null && isDiscInMeta(movedId)){
          if(markDiscMetaDone(movedId)){
            recordTriangle(movedId, {b:0,h:0,complexity:0,area:0,meta:true, initialMeta:true});
          }
          updateHud();
          if(metaCount()>=3){ completeMetaLevel(); return; }
          setStatus('');
          return;
        }

        setStatus('');
        return;
      }

      if(state.gameMode==='meta' && movedId!=null && isDiscInMeta(movedId)){
        if(markDiscMetaDone(movedId)){
          recordTriangle(movedId, {b:0,h:0,complexity:0,area:0,meta:true});
          playTone('pass');
        }
        updateHud();
        if(metaCount()>=3){ completeMetaLevel(); return; }
        setStatus('');
        return;
      }
      const valid = validateDoorPass(movedId, was[0]);
      if(valid.ok){
        recordTriangle(movedId, valid.metrics);
        if(state.gameMode==='goal' && checkGoal(movedId)) endSequence('goal','Gol');
        else {
          if(valid.inter) showPassGlow(valid.inter);
          playTone('pass');
          setStatus('');
        }
      } else {
        endSequence('foul', valid.reason || 'No atravesó limpiamente la puerta');
      }
    }
  }

  function handleInitialPush(){
    const back = state.discs[0];
    for(const f of [state.discs[1], state.discs[2]]){
      const dx=f.x-back.x, dy=f.y-back.y, dist=Math.hypot(dx,dy)||1;
      if(dist < 2*R + 0.04){
        const nx=dx/dist, ny=dy/dist;
        const rel=(back.vx-f.vx)*nx+(back.vy-f.vy)*ny;
        if(rel>0){
          const impulse=rel*0.52;
          f.vx += nx*impulse; f.vy += ny*impulse;
          back.vx -= nx*impulse*0.35; back.vy -= ny*impulse*0.35;
          if(state.shot && state.shot.initial && state.shot.hitId === 0){
            state.shot.initialTouched = state.shot.initialTouched || {};
            state.shot.initialTouched[f.id] = true;
          }
          playCollisionSound(rel);
        }
      }
    }
    const sep = state.discs.every((a,i)=>state.discs.every((b,j)=>i>=j || Math.hypot(a.x-b.x,a.y-b.y)>2*R + 0.06));
    if(sep) state.allowedInitial=false;
  }


  function cleanupAfterInitialMickeyShot(){
    // v19.4: si el saque inicial fue muy suave, las fichas pueden quedar
    // visualmente separadas, pero físicamente aún tocándose por tolerancias
    // internas. Antes de habilitar la regla normal, despejamos una holgura
    // mínima para que la siguiente jugada no cobre una colisión fantasma.
    const minDist = 2*R + 0.075;
    for(let iter=0; iter<10; iter++){
      let changed=false;
      for(let i=0;i<state.discs.length;i++){
        for(let j=i+1;j<state.discs.length;j++){
          if(state.gameMode==='meta' && (state.metaDone[i] || state.metaDone[j])) continue;
          const a=state.discs[i], b=state.discs[j];
          let dx=b.x-a.x, dy=b.y-a.y;
          let d=Math.hypot(dx,dy);
          if(d < 1e-6){ dx=(j-i)*0.001; dy=-0.001; d=Math.hypot(dx,dy); }
          if(d < minDist){
            const nx=dx/d, ny=dy/d;
            const push=(minDist-d)/2 + 0.002;
            a.x-=nx*push; a.y-=ny*push;
            b.x+=nx*push; b.y+=ny*push;
            a.vx=0; a.vy=0; b.vx=0; b.vy=0;
            changed=true;
          }
        }
      }
      for(const d of state.discs){
        if(state.gameMode==='meta' && state.metaDone[d.id]){ freezeDiscInMeta(d.id); continue; }
        d.x=Math.max(R, Math.min(FIELD_W-R, d.x));
        d.y=Math.max(R, Math.min(FIELD_H-R, d.y));
      }
      if(!changed) break;
    }
  }

  function detectFoul(){
    for(const d of state.discs){
      if(state.gameMode==='meta' && state.metaDone[d.id]) continue;
      if(d.x-R < 0 || d.x+R > FIELD_W || d.y-R < 0 || d.y+R > FIELD_H) return 'Ficha fuera de la cancha';
    }
    if(!state.allowedInitial && !isInitialShotActive()){
      for(let i=0;i<3;i++) for(let j=i+1;j<3;j++){
        if(state.gameMode==='meta' && (state.metaDone[i] || state.metaDone[j])) continue;
        if(Math.hypot(state.discs[i].x-state.discs[j].x,state.discs[i].y-state.discs[j].y) < 2*R-1e-3){
          playCollisionSound(1.0);
          return 'Colisión entre fichas';
        }
      }
    }
    return null;
  }
  function allStopped(){return state.discs.every(d=>(state.gameMode==='meta' && state.metaDone[d.id]) || Math.hypot(d.vx,d.vy)<0.04);}

  function validateDoorPass(id, prevStart){
    const moving=state.discs[id];
    if(id==null || !moving) return {ok:false, reason:'No hay ficha golpeada'};

    // v17.8: la puerta se congela al momento del golpe.
    // Esto evita que en el saque Mickey se cobre falta por validar contra
    // una puerta que ya cambió cuando las dos fichas delanteras fueron empujadas.
    const shot = (state.shot && state.shot.hitId === id) ? state.shot : null;
    const others=state.discs.filter(d=>d.id!==id);
    const A = shot ? shot.doorA : others[0];
    const B = shot ? shot.doorB : others[1];
    const start = shot ? shot.startHit : (state.lastStart || prevStart || {x:moving.x,y:moving.y});
    const end = {x:moving.x,y:moving.y};

    const side0 = orient(A,B,start), side1 = orient(A,B,end);
    if(Math.abs(side0)<1e-6 || Math.abs(side1)<1e-6 || side0*side1>=0) return {ok:false, reason:'No pasó de un lado al otro de la puerta'};

    const inter = lineIntersection(start,end,A,B);
    if(!inter) return {ok:false, reason:'No cruzó el segmento de la puerta'};

    const len = dist(A,B);
    if(len <= 1e-6) return {ok:false, reason:'La puerta quedó demasiado estrecha'};

    // En jugadas normales exigimos paso limpio. En el saque inicial se permite
    // el contacto del Mickey, por eso no se aplica esta restricción de margen.
    if(!shot?.initial){
      const margin = R;
      const t = paramOnSegment(A,B,inter);
      if(len <= 2*R + 0.06) return {ok:false, reason:'La puerta quedó demasiado estrecha para paso limpio'};
      if(t*len < margin || (1-t)*len < margin) return {ok:false, reason:'La ficha no atravesó limpiamente la puerta'};
    }

    const b=len;
    const h=Math.abs(orient(A,B,start))/b;
    const area=0.5*b*h;
    return {ok:true, metrics:{b,h,complexity:h/b,area}, inter};
  }
  function orient(a,b,c){return (b.x-a.x)*(c.y-a.y)-(b.y-a.y)*(c.x-a.x);}
  function dist(a,b){return Math.hypot(a.x-b.x,a.y-b.y);}
  function lineIntersection(p1,p2,p3,p4){
    const x1=p1.x,y1=p1.y,x2=p2.x,y2=p2.y,x3=p3.x,y3=p3.y,x4=p4.x,y4=p4.y;
    const den=(x1-x2)*(y3-y4)-(y1-y2)*(x3-x4); if(Math.abs(den)<1e-9) return null;
    const px=((x1*y2-y1*x2)*(x3-x4)-(x1-x2)*(x3*y4-y3*x4))/den;
    const py=((x1*y2-y1*x2)*(y3-y4)-(y1-y2)*(x3*y4-y3*x4))/den;
    const within=(v,a,b)=>v>=Math.min(a,b)-1e-6 && v<=Math.max(a,b)+1e-6;
    if(within(px,x1,x2)&&within(py,y1,y2)&&within(px,x3,x4)&&within(py,y3,y4)) return {x:px,y:py};
    return null;
  }
  function paramOnSegment(a,b,p){const L2=(b.x-a.x)**2+(b.y-a.y)**2; return ((p.x-a.x)*(b.x-a.x)+(p.y-a.y)*(b.y-a.y))/L2;}


  function recordTriangle(hitId=null, metrics=null){
    const tri=state.discs.map(d=>({x:d.x,y:d.y,id:d.id}));
    state.currentSeq.push({tri, hitId, metrics});
    state.lastTriangle = tri;
    if(metrics){state.totals.passes++; state.totals.complexity+=metrics.complexity; state.totals.area+=metrics.area;}
    state.totals.triangles++;
    renderLegend();
  }

  function endSequence(type, reason){
    if(state.messageLock) return;
    state.messageLock=true; state.running=false; state.phase='ended'; state.drag=null;
    if(type==='goal'){
      state.goals++;
      if(typeof captureFastestGoalMilestone === 'function') captureFastestGoalMilestone(state.goals, cfg.duration - state.timeLeft);
      updateHud(); playTone('goal'); showOverlay('goal','GOL'); setStatus('Gol. Revisa la jugada o vuelve al saque inicial.');
    }
    else {state.totals.fouls++; playTone('foul'); showOverlay('foul','FALTA'); setStatus(reason+'.');}
    const seq = JSON.parse(JSON.stringify(state.currentSeq));
    const metrics = summarizeSeq(seq);
    const elapsed = state.gameMode==='meta' ? state.metaElapsed : (cfg.duration - state.timeLeft);
    const duration = state.gameMode==='meta' ? state.metaElapsed : Math.max(0, elapsed - state.attemptStart);
    state.history.push({type, reason, seq, metrics, goalsAt:state.goals, time:elapsed, duration});
    state.lastAttemptIndex = state.history.length - 1;
    updateActionButtons();
  }
  function finishGame(exitOnly){
    state.running=false; state.phase='ended'; state.ended=true;
    if(!exitOnly){
      saveRecordFromUI(); renderStats(); showModal('statsModal');
      setStatus('⏱ Fin');
    }
    updateActionButtons();
  }

  canvas.addEventListener('pointerdown', e=>{
    if(state.introZoom || state.phase!=='aim' || !state.running) return;

    if(cfg.kickMode === 'dirforce'){
      handleDirForceTap(e);
      return;
    }

    const p=screenToWorld(e.clientX,e.clientY); const hit=pickDisc(p);
    if(hit==null) return;
    if(state.lastHit===hit){setStatus('No puedes golpear la ficha recién golpeada.'); return;}
    if(state.allowedInitial && hit!==0){setStatus('Primero golpea la ficha trasera.'); return;}
    state.selected=hit; state.drag={start:p,current:p,t0:performance.now(),last:p,lastT:performance.now(),velocity:{x:0,y:0}};
    state.lastStart={x:state.discs[hit].x,y:state.discs[hit].y};
    canvas.setPointerCapture(e.pointerId);
  });
  canvas.addEventListener('pointermove', e=>{
    if(cfg.kickMode !== 'sling') return;
    if(!state.drag) return;
    const now=performance.now(), p=screenToWorld(e.clientX,e.clientY), last=state.drag.current, dt=Math.max(1,(now-state.drag.lastT))/1000;
    state.drag.velocity={x:(p.x-last.x)/dt,y:(p.y-last.y)/dt}; state.drag.current=p; state.drag.lastT=now;
  });
  canvas.addEventListener('pointerup', e=>{
    if(cfg.kickMode !== 'sling') return;
    if(!state.drag || state.selected==null) return;
    const p=state.drag.current;
    const vx=p.x-state.drag.start.x, vy=p.y-state.drag.start.y;
    const pull=Math.hypot(vx,vy);
    const speedGesture=Math.hypot(state.drag.velocity.x,state.drag.velocity.y);
    if(pull<0.08){state.drag=null; state.selected=null; return;}
    // Honda/pasador v16.3:
    // Escala lineal pura: mitad del estiramiento útil = mitad de la fuerza máxima.
    // El estiramiento visible se satura en SLING_MAX_PULL y la fuerza máxima es
    // la misma que en el modo Dirección + fuerza.
    const dirx=-vx/pull, diry=-vy/pull;
    const pullRatio=Math.max(0, Math.min(1, pull/SLING_MAX_PULL));
    const force=SHOT_MAX_SPEED * pullRatio;
    launchSelected(dirx, diry, force);
  });
  canvas.addEventListener('pointercancel', ()=>{state.drag=null; state.selected=null;});

  function handleDirForceTap(e){
    const p=screenToWorld(e.clientX,e.clientY);

    if(state.aimMode === 'idle'){
      const hit=pickDisc(p);
      if(hit==null) return;
      if(state.lastHit===hit){setStatus('No puedes golpear la ficha recién golpeada.'); return;}
      if(state.allowedInitial && hit!==0){setStatus('Primero golpea la ficha trasera.'); return;}
      state.selected=hit;
      state.lastStart={x:state.discs[hit].x,y:state.discs[hit].y};
      state.aimMode='direction';
      state.aimAngle= -Math.PI/2;
      state.aimAngleFixed=null;
      state.forceValue=0;
      state.forceDir=1;
      setStatus('');
      return;
    }

    if(state.aimMode === 'direction'){
      state.aimAngleFixed = state.aimAngle;
      state.aimMode='force';
      state.forceValue=0;
      state.forceDir=1;
      setStatus('');
      return;
    }

    if(state.aimMode === 'force'){
      // Misma escala que la honda: barra al 100% = SHOT_MAX_SPEED;
      // barra al 50% = 50% de la fuerza máxima.
      const force = SHOT_MAX_SPEED * Math.max(0, Math.min(1, state.forceValue));
      const a = state.aimAngleFixed ?? state.aimAngle;
      launchSelected(Math.cos(a), Math.sin(a), force);
    }
  }

  function captureShotSnapshot(hitId){
    const hit = state.discs[hitId];
    const others = state.discs.filter(d => d.id !== hitId);
    state.shot = {
      hitId,
      initial: !!state.allowedInitial,
      startHit: {x: hit.x, y: hit.y},
      doorA: {x: others[0].x, y: others[0].y, id: others[0].id},
      doorB: {x: others[1].x, y: others[1].y, id: others[1].id},
      initialTouched: {}
    };
    state.lastStart = {x: hit.x, y: hit.y};
  }

  function launchSelected(dirx, diry, force){
    if(state.selected==null) return;
    captureShotSnapshot(state.selected);
    const d=state.discs[state.selected];
    d.vx=dirx*force; d.vy=diry*force;
    state.lastHit=state.selected;
    state.phase='moving';
    state.drag=null;
    state.selected=null;
    state.aimMode='idle';
    state.aimAngleFixed=null;
    setStatus('');
  }

  function pickDisc(p){
    let best=null, bd=999;
    for(const d of state.discs){
      if(state.gameMode==='meta' && state.metaDone[d.id]) continue;
      const dd=Math.hypot(p.x-d.x,p.y-d.y); if(dd<R*1.35 && dd<bd){best=d.id; bd=dd;}
    }
    return best;
  }


  function introZoomInfo(){
    if(!state.introZoom) return null;
    const elapsed = performance.now() - state.introStart;
    const t = Math.min(1, Math.max(0, elapsed / state.introDuration));
    // easeOutCubic
    const e = 1 - Math.pow(1 - t, 3);
    const zoom = 2.65 - 1.65 * e;
    const goalCenter = { x: FIELD_W/2 * scale, y: (GOAL_TOP + GOAL_D*0.55) * scale };
    return { zoom, cx: goalCenter.x, cy: goalCenter.y };
  }

  function draw(){
    if(!pxW) resize();
    ctx.clearRect(0,0,pxW,pxH);

    const intro = introZoomInfo();
    if(intro){
      ctx.save();
      ctx.translate(intro.cx, intro.cy);
      ctx.scale(intro.zoom, intro.zoom);
      ctx.translate(-intro.cx, -intro.cy);
    }

    drawField();
    if(state.showTri || performance.now() < state.goalChainUntil) drawTriangles();
    else drawLastTriangle();
    if(state.gameMode==='meta') { drawMetaBand(); drawPaintPools(); } else drawGoal();
    drawDiscs();
    drawDoor();
    drawPassGlow();
    if(!state.introZoom) drawAiming();

    if(intro){
      ctx.restore();

      // Viñeta suave para dar sensación de cámara entrando desde el arco.
      const alpha = Math.max(0, 0.30 * (1 - ((2.65 - intro.zoom)/1.65)));
      ctx.save();
      ctx.fillStyle = `rgba(2,6,23,${alpha.toFixed(3)})`;
      ctx.fillRect(0,0,pxW,pxH);
      ctx.restore();
    }
  }
  function drawField(){
    ctx.save();

    const W=pxW, H=pxH;
    const isTri=state.showTri;

    // v15.4: pasada final de superficies.
    // Menos trazos grandes; más microtextura, compactación y luz suave de estadio.
    const g=ctx.createLinearGradient(0,0,0,H);
    if(cfg.surface==='grass'){
      g.addColorStop(0,'#2f9f4e'); g.addColorStop(.40,'#176b35'); g.addColorStop(1,'#082c1b');
    } else if(cfg.surface==='concrete'){
      g.addColorStop(0,'#898f8d'); g.addColorStop(.44,'#565d5d'); g.addColorStop(1,'#24292b');
    } else if(cfg.surface==='dirt'){
      g.addColorStop(0,'#bd7b32'); g.addColorStop(.45,'#844415'); g.addColorStop(1,'#3f1907');
    } else if(cfg.surface==='wood'){
      g.addColorStop(0,'#bd7330'); g.addColorStop(.43,'#733511'); g.addColorStop(1,'#2b1006');
    } else {
      g.addColorStop(0,'#eff8ff'); g.addColorStop(.44,'#bfd7eb'); g.addColorStop(1,'#8099ad');
    }
    ctx.fillStyle=g;
    roundRect(0,0,W,H,22*dpr,true,false);

    function hash(i){ const x=Math.sin(i*127.1+311.7)*43758.5453; return x-Math.floor(x); }
    function spot(cx,cy,r,stops){
      const rg=ctx.createRadialGradient(cx,cy,0,cx,cy,r);
      rg.addColorStop(0,stops[0]); rg.addColorStop(.52,stops[1]); rg.addColorStop(1,stops[2]);
      ctx.fillStyle=rg; ctx.fillRect(0,0,W,H);
    }
    function vignette(a=.34){
      const vg=ctx.createRadialGradient(W/2,H*.42,Math.min(W,H)*.12,W/2,H*.52,Math.max(W,H)*.80);
      vg.addColorStop(0,'rgba(0,0,0,0)'); vg.addColorStop(.58,'rgba(0,0,0,0)'); vg.addColorStop(1,`rgba(2,6,23,${a})`);
      ctx.fillStyle=vg; ctx.fillRect(0,0,W,H);
    }
    function stadiumLight(opts={}){
      const warm=opts.warm ?? 'rgba(255,245,205,';
      const topA=opts.topA ?? .22, midA=opts.midA ?? .065, vig=opts.vig ?? .34;
      spot(W*.50,H*.12,W*.46,[`${warm}${topA})`,`${warm}${midA})`,`${warm}0)`]);
      spot(W*.50,H*.49,W*.58,['rgba(255,255,255,.070)','rgba(255,255,255,.024)','rgba(255,255,255,0)']);
      vignette(vig);
    }
    function goalCastShadow(op=.10){
      const y=GOAL_TOP*scale + GOAL_D*scale*.96, x=W*.50;
      const rg=ctx.createRadialGradient(x,y,0,x,y,W*.20);
      rg.addColorStop(0,`rgba(2,6,23,${op})`); rg.addColorStop(.55,`rgba(2,6,23,${op*.35})`); rg.addColorStop(1,'rgba(2,6,23,0)');
      ctx.fillStyle=rg; ctx.fillRect(0,0,W,H*.28);
    }
    function microDots(n, colors, minR, maxR, alphaMul=1){
      ctx.save();
      for(let i=0;i<n;i++){
        const x=hash(i*3+1)*W, y=hash(i*3+2)*H;
        const rr=(minR + hash(i*3+3)*(maxR-minR))*dpr;
        ctx.globalAlpha=alphaMul*(.22+.78*hash(i*5+7)); ctx.fillStyle=colors[i%colors.length];
        ctx.beginPath(); ctx.arc(x,y,rr,0,Math.PI*2); ctx.fill();
      }
      ctx.restore();
    }
    function fineScratches(n, colorA, colorB, alpha=.20, maxLen=60, angleBase=0, angleSpread=.8){
      ctx.save();
      for(let i=0;i<n;i++){
        const x=hash(i*11+1)*W, y=hash(i*11+2)*H, len=(8 + hash(i*11+3)*maxLen)*dpr;
        const ang=angleBase + (hash(i*11+4)-.5)*angleSpread;
        ctx.globalAlpha=alpha*(.32+.68*hash(i*11+5)); ctx.strokeStyle=hash(i*11+6)>.5 ? colorA : colorB;
        ctx.lineWidth=(.25+hash(i*11+7)*.44)*dpr;
        ctx.beginPath(); ctx.moveTo(x,y); ctx.lineTo(x+Math.cos(ang)*len, y+Math.sin(ang)*len); ctx.stroke();
      }
      ctx.restore();
    }

    if(cfg.surface==='grass'){
      const stripeW=W/7.9;
      for(let i=-1;i<10;i++){
        const sw=stripeW*(.96+.12*hash(i+12));
        ctx.fillStyle=i%2===0?'rgba(255,255,190,.070)':'rgba(0,35,16,.115)';
        ctx.fillRect(i*stripeW,0,sw,H);
      }
      microDots(1150, ['rgba(180,255,170,.090)','rgba(25,90,38,.170)','rgba(230,255,200,.055)','rgba(5,45,22,.120)'], .18, .95, .88);
      fineScratches(640, 'rgba(220,255,205,.140)', 'rgba(3,55,24,.145)', .20, 9, Math.PI/2, 1.8);
      spot(W*.52,H*.12,W*.39,['rgba(255,246,160,.25)','rgba(255,246,160,.080)','rgba(255,246,160,0)']);
      stadiumLight({topA:.18, midA:.055, vig:.34});
      goalCastShadow(.055);

    } else if(cfg.surface==='hockey'){
      const bandH=2.10*scale;
      const bg=ctx.createLinearGradient(0,0,0,bandH);
      bg.addColorStop(0,'rgba(52,72,92,.48)'); bg.addColorStop(.70,'rgba(96,118,140,.32)'); bg.addColorStop(1,'rgba(190,213,235,.03)');
      ctx.fillStyle=bg; roundRect(0,0,W,Math.min(H,bandH),22*dpr,true,false);
      fineScratches(470, 'rgba(255,255,255,.30)', 'rgba(45,72,98,.22)', .135, 34, 0, .88);
      fineScratches(150, 'rgba(255,255,255,.20)', 'rgba(40,63,86,.16)', .090, 56, Math.PI*.03, .32);
      microDots(900, ['rgba(255,255,255,.035)','rgba(95,130,160,.044)','rgba(210,235,255,.040)'], .12, .55, .82);
      spot(W*.38,H*.22,W*.52,['rgba(255,255,255,.34)','rgba(210,235,255,.115)','rgba(210,235,255,0)']);
      spot(W*.58,H*.65,W*.55,['rgba(255,255,255,.12)','rgba(190,220,245,.044)','rgba(190,220,245,0)']);
      ctx.save();
      for(let i=0;i<34;i++){
        const x=hash(i*41+2)*W, y=hash(i*41+3)*H, r=(3+hash(i*41+4)*9)*dpr;
        const rg=ctx.createRadialGradient(x,y,0,x,y,r);
        rg.addColorStop(0,'rgba(255,255,255,.10)'); rg.addColorStop(1,'rgba(255,255,255,0)');
        ctx.fillStyle=rg; ctx.fillRect(x-r,y-r,2*r,2*r);
      }
      ctx.restore();
      goalCastShadow(.045); vignette(.16);

    } else if(cfg.surface==='concrete'){
      microDots(1850, ['rgba(255,255,255,.034)','rgba(6,10,14,.085)','rgba(120,128,132,.065)','rgba(30,34,36,.050)'], .12, 1.15, .92);
      ctx.save();
      for(let i=0;i<135;i++){
        const x=hash(i*19+4)*W, y=hash(i*19+5)*H, rad=(7+hash(i*19+6)*58)*dpr;
        const rg=ctx.createRadialGradient(x,y,0,x,y,rad);
        rg.addColorStop(0, hash(i*19+7)>.50 ? 'rgba(255,255,255,.044)' : 'rgba(5,8,10,.105)');
        rg.addColorStop(1,'rgba(0,0,0,0)'); ctx.fillStyle=rg; ctx.fillRect(x-rad,y-rad,2*rad,2*rad);
      }
      ctx.globalAlpha=.115; ctx.strokeStyle='rgba(3,7,10,.62)';
      for(let i=0;i<30;i++){
        let x=hash(i*31+1)*W, y=hash(i*31+2)*H;
        ctx.beginPath(); ctx.moveTo(x,y);
        const steps=2+Math.floor(hash(i*31+3)*4);
        for(let k=0;k<steps;k++){
          x+=(hash(i*31+4+k)-.5)*30*dpr; y+=(6+hash(i*31+9+k)*18)*dpr;
          ctx.lineWidth=(.35+hash(i*13+k)*.45)*dpr; ctx.lineTo(x,y);
        }
        ctx.stroke();
        if(hash(i*31+15)>.55){ ctx.beginPath(); ctx.moveTo(x,y); ctx.lineTo(x+(hash(i*31+16)-.5)*24*dpr, y+(hash(i*31+17)-.5)*18*dpr); ctx.stroke(); }
      }
      ctx.restore();
      spot(W*.50,H*.15,W*.42,['rgba(255,238,215,.20)','rgba(255,238,215,.060)','rgba(255,238,215,0)']);
      stadiumLight({topA:.16, midA:.052, vig:.39}); goalCastShadow(.070);

    } else if(cfg.surface==='dirt'){
      microDots(1500, ['rgba(255,218,145,.185)','rgba(86,32,7,.160)','rgba(170,85,24,.170)','rgba(255,238,190,.085)'], .12, 1.25, .86);
      microDots(70, ['rgba(50,20,6,.28)','rgba(120,65,22,.20)','rgba(235,170,95,.12)'], .85, 2.7, .45);
      ctx.save();
      for(let i=0;i<78;i++){
        const x=hash(i*17+6)*W, y=hash(i*17+7)*H;
        const rw=(18+hash(i*17+8)*74)*dpr, rh=(8+hash(i*17+10)*28)*dpr, maxr=Math.max(rw,rh);
        const rg=ctx.createRadialGradient(x,y,0,x,y,maxr);
        rg.addColorStop(0, hash(i*17+9)>.5 ? 'rgba(57,20,5,.105)' : 'rgba(255,202,120,.070)'); rg.addColorStop(1,'rgba(0,0,0,0)');
        ctx.save(); ctx.translate(x,y); ctx.rotate((hash(i*17+11)-.5)*.7); ctx.scale(rw/maxr, rh/maxr);
        ctx.fillStyle=rg; ctx.fillRect(-maxr,-maxr,2*maxr,2*maxr); ctx.restore();
      }
      ctx.globalAlpha=.11; ctx.strokeStyle='rgba(60,22,5,.34)'; ctx.lineWidth=.45*dpr;
      for(let i=0;i<34;i++){
        const x=hash(i*29+4)*W, y=hash(i*29+5)*H;
        ctx.beginPath(); ctx.moveTo(x,y); ctx.lineTo(x+(hash(i*29+6)-.5)*34*dpr, y+(hash(i*29+7)-.5)*18*dpr); ctx.stroke();
      }
      ctx.globalAlpha=.075;
      for(let j=0;j<16;j++){
        const yy=(j+.35)*H/16;
        ctx.strokeStyle=j%2?'rgba(255,225,160,.24)':'rgba(60,22,5,.25)'; ctx.lineWidth=(.35+hash(j)*.34)*dpr;
        ctx.beginPath();
        for(let x=0;x<=W;x+=20*dpr){
          const y2=yy+Math.sin(x/(54*dpr)+j*.73)*2.0*dpr+Math.sin(x/(128*dpr)+j*1.9)*1.3*dpr;
          if(x===0) ctx.moveTo(x,y2); else ctx.lineTo(x,y2);
        }
        ctx.stroke();
      }
      ctx.restore();
      spot(W*.52,H*.16,W*.44,['rgba(255,205,115,.27)','rgba(255,176,75,.088)','rgba(255,176,75,0)']);
      stadiumLight({topA:.16, midA:.050, vig:.36}); goalCastShadow(.055);

    } else if(cfg.surface==='wood'){
      ctx.save();
      const plankH=H/20;
      for(let j=0;j<22;j++){
        const y=j*plankH;
        ctx.fillStyle=j%2?'rgba(255,198,110,.046)':'rgba(0,0,0,.062)'; ctx.fillRect(0,y,W,plankH*.95);
        ctx.strokeStyle='rgba(255,230,170,.090)'; ctx.lineWidth=.70*dpr; ctx.beginPath(); ctx.moveTo(0,y); ctx.lineTo(W,y); ctx.stroke();
        const offset=(j%2)*W*.18;
        for(let x=offset; x<W; x+=W*.34){
          ctx.globalAlpha=.12; ctx.strokeStyle='rgba(30,10,3,.45)'; ctx.beginPath(); ctx.moveTo(x,y+plankH*.10); ctx.lineTo(x,y+plankH*.88); ctx.stroke();
        }
        ctx.globalAlpha=1;
      }
      for(let j=0;j<105;j++){
        const y=(j+.12)*H/105;
        ctx.strokeStyle=j%2?'rgba(255,214,145,.090)':'rgba(25,8,3,.115)'; ctx.lineWidth=(.22+hash(j)*.28)*dpr;
        ctx.beginPath();
        for(let x=0;x<=W;x+=14*dpr){
          const y2=y+Math.sin(x/(44*dpr)+j*.63)*1.15*dpr+Math.sin(x/(130*dpr)+j*1.1)*.85*dpr;
          if(x===0) ctx.moveTo(x,y2); else ctx.lineTo(x,y2);
        }
        ctx.stroke();
      }
      for(let i=0;i<34;i++){
        const x=hash(i*23+2)*W, y=hash(i*23+3)*H, rad=(5+hash(i*23+4)*22)*dpr;
        const rg=ctx.createRadialGradient(x,y,0,x,y,rad);
        rg.addColorStop(0,'rgba(18,7,2,.15)'); rg.addColorStop(.55,'rgba(60,24,8,.055)'); rg.addColorStop(1,'rgba(0,0,0,0)');
        ctx.fillStyle=rg; ctx.fillRect(x-rad,y-rad,2*rad,2*rad);
      }
      ctx.restore();
      microDots(420, ['rgba(255,220,150,.035)','rgba(25,8,3,.050)','rgba(130,65,25,.035)'], .10, .62, .72);
      spot(W*.50,H*.15,W*.43,['rgba(255,202,118,.31)','rgba(255,165,70,.095)','rgba(255,165,70,0)']);
      stadiumLight({topA:.15, midA:.045, vig:.41}); goalCastShadow(.055);
    }

    if(isTri){ ctx.fillStyle='rgba(2,6,23,.78)'; roundRect(0,0,W,H,22*dpr,true,false); }

    ctx.strokeStyle=cfg.surface==='hockey'?'rgba(15,23,42,.64)':'rgba(255,255,255,.84)';
    ctx.lineWidth=3*dpr;
    ctx.strokeRect(R*scale,R*scale,(FIELD_W-2*R)*scale,(FIELD_H-2*R)*scale);

    ctx.globalAlpha=cfg.surface==='hockey' ? .105 : (cfg.surface==='wood' ? .105 : .100);
    ctx.fillStyle=cfg.surface==='hockey'?'#0f172a':'#ffffff';
    for(let y=2;y<FIELD_H;y+=2){ctx.fillRect(0,y*scale,W,1*dpr);}
    ctx.globalAlpha=1;

    ctx.restore();
  }


  function drawMetaBand(){
    ctx.save();
    const zones = metaZones();

    function drawCheckeredZone(z, label, cols, rows){
      // Recorte dentro del rectángulo blanco de la cancha.
      const left = Math.max(z.left, R);
      const right = Math.min(z.right, FIELD_W - R);
      const top = Math.max(z.top, R);
      const bottom = Math.min(z.bottom, FIELD_H - R);
      const x = left * scale;
      const y = top * scale;
      const w = (right - left) * scale;
      const h = (bottom - top) * scale;
      if(w<=0 || h<=0) return;

      ctx.save();
      ctx.beginPath();
      ctx.rect(x,y,w,h);
      ctx.clip();
      ctx.globalAlpha=0.96;

      const cellW=w/cols, cellH=h/rows;
      for(let r=0; r<rows; r++){
        for(let c=0; c<cols; c++){
          const dark = ((r+c)%2)===0;
          if(z.tint){
            ctx.fillStyle = dark ? hexA(z.tint, .92) : 'rgba(248,250,252,.88)';
          } else {
            ctx.fillStyle = dark ? 'rgba(248,250,252,.86)' : 'rgba(15,23,42,.72)';
          }
          ctx.fillRect(x+c*cellW, y+r*cellH, cellW+0.6*dpr, cellH+0.6*dpr);
        }
      }

      const grad=ctx.createLinearGradient(0,y,0,y+h);
      grad.addColorStop(0,'rgba(255,255,255,.26)');
      grad.addColorStop(.5,'rgba(250,204,21,.08)');
      grad.addColorStop(1,'rgba(2,6,23,.22)');
      ctx.fillStyle=grad; ctx.fillRect(x,y,w,h);

      if(label){
        ctx.font=`900 ${Math.max(13*dpr, Math.min(h*.24, 20*dpr))}px system-ui`;
        ctx.textAlign='center'; ctx.textBaseline='middle';
        ctx.fillStyle='rgba(2,6,23,.82)';
        ctx.fillText(label, x+w/2+1.5*dpr, y+h/2+1.5*dpr);
        ctx.fillStyle='rgba(255,255,255,.94)';
        ctx.fillText(label, x+w/2, y+h/2);
      }
      ctx.restore();

      ctx.save();
      ctx.strokeStyle=z.border || 'rgba(250,204,21,.90)'; ctx.lineWidth=3*dpr;
      ctx.shadowColor=z.border || 'rgba(250,204,21,.45)'; ctx.shadowBlur=10*dpr;
      ctx.strokeRect(x,y,w,h);
      ctx.restore();
    }

    if(state.currentMetaWorld===1 && state.currentMetaLevel===1){
      drawCheckeredZone(zones[0], 'META', 16, 4);
    } else {
      zones.forEach(z=>drawCheckeredZone(z, '', 4, 4));
    }
    ctx.restore();
  }

  function drawPaintPools(){
    const pools = paintZones();
    if(!pools.length) return;
    const now = performance.now();
    ctx.save();
    for(const p of pools){
      const x=p.cx*scale, y=p.cy*scale;
      const rx=(p.rx || p.r || 0.5)*scale, ry=(p.ry || p.r || 0.5)*scale;
      const rr=Math.max(rx,ry);
      const pulse = 0.5 + 0.5*Math.sin(now/360);
      ctx.save();
      ctx.shadowColor=p.color;
      ctx.shadowBlur=(14+8*pulse)*dpr;
      const grad=ctx.createRadialGradient(x-rx*.22,y-ry*.32,Math.max(2*dpr,Math.min(rx,ry)*.08),x,y,rr*1.22);
      grad.addColorStop(0,'rgba(255,255,255,.92)');
      grad.addColorStop(.18,hexA(p.border,.92));
      grad.addColorStop(.48,hexA(p.color,.90));
      grad.addColorStop(.82,hexA(p.deep || p.color,.76));
      grad.addColorStop(1,hexA(p.deep || p.color,0));
      ctx.fillStyle=grad;
      ctx.beginPath();
      const pts=[];
      const lobes=36;
      for(let i=0;i<lobes;i++){
        const a=(Math.PI*2*i/lobes) + Math.sin(now/980)*0.035;
        const wave=0.055*Math.sin(i*1.35+now/720)+0.035*Math.sin(i*2.4-now/900);
        const bump=(i%9===0?0.025:0);
        pts.push([x+Math.cos(a)*rx*(0.94+wave+bump), y+Math.sin(a)*ry*(0.94+wave+bump)]);
      }
      for(let i=0;i<pts.length;i++){
        const p0=pts[(i-1+pts.length)%pts.length];
        const p1=pts[i];
        const mid=[(p0[0]+p1[0])/2,(p0[1]+p1[1])/2];
        if(i===0) ctx.moveTo(mid[0],mid[1]);
        ctx.quadraticCurveTo(p1[0],p1[1],(p1[0]+pts[(i+1)%pts.length][0])/2,(p1[1]+pts[(i+1)%pts.length][1])/2);
      }
      ctx.closePath();
      ctx.fill();
      ctx.lineWidth=2.0*dpr;
      ctx.strokeStyle=hexA(p.border,.88);
      ctx.stroke();
      ctx.globalAlpha=.45+.18*pulse;
      ctx.fillStyle='rgba(255,255,255,.88)';
      ctx.beginPath();
      ctx.ellipse(x-rx*.22,y-ry*.26,rx*.22,ry*.12,-0.25,0,Math.PI*2);
      ctx.fill();
      ctx.restore();
    }

    const bursts = state.paintBursts || [];
    state.paintBursts = bursts.filter(b => now-b.t < 820);
    for(const b of state.paintBursts){
      const age=(now-b.t)/820;
      const alpha=1-age;
      const cx=b.x*scale, cy=b.y*scale;
      ctx.save();
      ctx.globalAlpha=alpha;
      ctx.strokeStyle=hexA(b.color,.85);
      ctx.lineWidth=(2.5+3*alpha)*dpr;
      ctx.shadowColor=b.color;
      ctx.shadowBlur=18*dpr*alpha;
      ctx.beginPath(); ctx.arc(cx,cy,(0.48+age*1.1)*scale,0,Math.PI*2); ctx.stroke();
      for(let i=0;i<16;i++){
        const a=i*Math.PI*2/16 + (b.discId||0)*0.37;
        const r=(0.25+age*1.15)*scale;
        const px=cx+Math.cos(a)*r, py=cy+Math.sin(a)*r;
        ctx.fillStyle=hexA(b.color,alpha*.9);
        ctx.beginPath(); ctx.arc(px,py,(2.4+2.2*(1-age))*dpr,0,Math.PI*2); ctx.fill();
      }
      ctx.restore();
    }
    ctx.restore();
  }

  function drawGoal(){
    const left=(FIELD_W-GOAL_W)/2, top=GOAL_TOP, w=GOAL_W, h=GOAL_D;
    const x=left*scale, y=top*scale, ww=w*scale, hh=h*scale;

    const glowActive = performance.now() < state.goalGlowUntil;
    const pulse = glowActive ? (0.65 + 0.35*Math.sin(performance.now()/1000*22)) : 0;

    ctx.save();

    // Alineación visual/geométrica: la boca frontal del arco queda ajustada
    // a la zona real de gol. No cambia detección ni física.
    const svgW = ww * 1.37;
    const svgH = hh * 1.50;
    const sx = x - svgW * (70/520);
    const sy = y - svgH * (39/260);

    if(goalPremiumImage && goalPremiumImage.complete && goalPremiumImage.naturalWidth > 0){
      ctx.drawImage(goalPremiumImage, sx, sy, svgW, svgH);
    } else {
      ctx.fillStyle='rgba(255,255,255,.10)';
      ctx.fillRect(x,y,ww,hh);
      ctx.strokeStyle='white';
      ctx.lineWidth=4*dpr;
      ctx.strokeRect(x,y,ww,hh);
    }

    if(glowActive){
      ctx.save();
      ctx.shadowColor='rgba(250,204,21,.95)';
      ctx.shadowBlur=(24+24*pulse)*dpr;
      ctx.strokeStyle=`rgba(253,224,71,${0.76+0.18*pulse})`;
      ctx.lineWidth=(5+2*pulse)*dpr;
      ctx.beginPath();
      ctx.roundRect ? ctx.roundRect(x, y, ww, hh, 8*dpr) : ctx.rect(x,y,ww,hh);
      ctx.stroke();

      ctx.fillStyle=`rgba(250,204,21,${0.06+0.08*pulse})`;
      ctx.beginPath();
      ctx.ellipse(x+ww/2, y+hh/2, ww*0.72, hh*0.62, 0, 0, Math.PI*2);
      ctx.fill();
      ctx.restore();
    }

    // Zona real de detección muy sutil.
    ctx.save();
    ctx.strokeStyle = cfg.surface === 'hockey' ? 'rgba(15,23,42,.20)' : 'rgba(255,255,255,.16)';
    ctx.lineWidth=1*dpr;
    ctx.strokeRect(x,y,ww,hh);
    ctx.restore();

    ctx.restore();
  }

  function drawLastTriangle(){
    if(!state.lastTriangle) return;
    const pts=state.lastTriangle.map(p=>worldToScreen(p));
    ctx.beginPath();
    ctx.moveTo(pts[0].x,pts[0].y);
    ctx.lineTo(pts[1].x,pts[1].y);
    ctx.lineTo(pts[2].x,pts[2].y);
    ctx.closePath();
    ctx.fillStyle='rgba(56,189,248,0.10)';
    ctx.strokeStyle='rgba(56,189,248,0.28)';
    ctx.lineWidth=2*dpr;
    ctx.fill();
    ctx.stroke();
  }

  function drawTriangles(){
    const chainGlow = performance.now() < state.goalChainUntil;
    const glowPhase = chainGlow ? (0.5+0.5*Math.sin(performance.now()/1000*12)) : 0;
    const isIce = cfg.surface === 'hockey';

    state.currentSeq.forEach((s,i)=>{
      const pts=s.tri.map(p=>worldToScreen(p));
      const baseColor=COLORS[i%COLORS.length];

      ctx.save();
      ctx.beginPath(); 
      ctx.moveTo(pts[0].x,pts[0].y); 
      ctx.lineTo(pts[1].x,pts[1].y); 
      ctx.lineTo(pts[2].x,pts[2].y); 
      ctx.closePath();

      if(chainGlow){
        ctx.shadowColor=baseColor;
        ctx.shadowBlur=(10+10*glowPhase)*dpr;
      } else if(isIce){
        ctx.shadowColor='rgba(15,23,42,.22)';
        ctx.shadowBlur=4*dpr;
      }

      ctx.fillStyle=hexA(baseColor, chainGlow ? .18 : (isIce ? .17 : .11)); 
      ctx.strokeStyle=hexA(baseColor, chainGlow ? .98 : (isIce ? .96 : .88)); 
      ctx.lineWidth=(chainGlow ? 3.4 : (isIce ? 3.0 : 2.5))*dpr; 
      ctx.fill(); 
      ctx.stroke();

      const cx=(pts[0].x+pts[1].x+pts[2].x)/3, cy=(pts[0].y+pts[1].y+pts[2].y)/3;
      ctx.shadowBlur=0;
      ctx.fillStyle=baseColor; 
      ctx.font=`${12*dpr}px system-ui`; 
      ctx.fontWeight='bold'; 
      ctx.fillText('T'+(i+1),cx,cy);
      ctx.restore();
    });
  }

  function drawDoor(){
    // Puerta objetivo mientras hay una ficha seleccionada.
    // No toca la física ni agrega estados nuevos.
    if(state.selected==null) return;
    if(cfg.kickMode === 'sling' && !state.drag) return;
    if(cfg.kickMode === 'dirforce' && state.aimMode === 'idle') return;

    const others = state.discs.filter(d => d.id !== state.selected);
    if(others.length !== 2) return;

    const pA = worldToScreen(others[0]);
    const pB = worldToScreen(others[1]);
    const pulse = 0.5 + 0.5 * Math.sin(performance.now() / 1000 * 8);

    ctx.save();
    ctx.lineCap = 'round';

    ctx.strokeStyle = 'rgba(2,6,23,.38)';
    ctx.lineWidth = 7 * dpr;
    ctx.setLineDash([]);
    ctx.beginPath();
    ctx.moveTo(pA.x, pA.y);
    ctx.lineTo(pB.x, pB.y);
    ctx.stroke();

    ctx.strokeStyle = 'rgba(250,204,21,1)';
    ctx.lineWidth = 4 * dpr;
    ctx.setLineDash([1 * dpr, 10 * dpr]);
    ctx.shadowColor = 'rgba(250,204,21,.78)';
    ctx.shadowBlur = (14 + 6 * pulse) * dpr;
    ctx.beginPath();
    ctx.moveTo(pA.x, pA.y);
    ctx.lineTo(pB.x, pB.y);
    ctx.stroke();

    ctx.setLineDash([]);
    for(const p of [pA, pB]){
      ctx.fillStyle = 'rgba(250,204,21,1)';
      ctx.shadowColor = 'rgba(250,204,21,.88)';
      ctx.shadowBlur = (16 + 6 * pulse) * dpr;
      ctx.beginPath();
      ctx.arc(p.x, p.y, (5.2 + 1.0 * pulse) * dpr, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,.95)';
      ctx.lineWidth = 1.5 * dpr;
      ctx.stroke();
    }

    ctx.restore();
  }

  function isDiscPlayable(id){
    if(state.gameMode==='meta' && state.metaDone[id]) return false;
    if(state.phase!=='aim' || !state.running) return false;
    if(state.allowedInitial) return id===0;
    return state.lastHit!==id;
  }

  function drawDiscs(){
    for(const d of state.discs){
      const p = worldToScreen(d);
      const r = R * scale;
      const playable = isDiscPlayable(d.id);
      const blocked = (state.phase === 'aim' && state.running && state.lastHit === d.id && !state.allowedInitial);
      const sprite = tokenSprites[d.name];

      ctx.save();

      // Sombra proyectada muy suave al césped: ancla la ficha a la cancha.
      // No afecta física ni colisiones.
      ctx.save();
      ctx.globalAlpha = blocked ? .34 : .48;
      ctx.shadowColor = 'rgba(0,0,0,.34)';
      ctx.shadowBlur = 9 * dpr;
      ctx.shadowOffsetX = 1.6 * dpr;
      ctx.shadowOffsetY = 3.2 * dpr;
      ctx.beginPath();
      ctx.ellipse(p.x + 1.6*dpr, p.y + r*0.36, r*0.92, r*0.34, 0, 0, Math.PI*2);
      ctx.fillStyle = 'rgba(0,0,0,.22)';
      ctx.fill();
      ctx.restore();

      // Aro de disponibilidad más sutil:
      // menos grosor, menos opacidad y menos brillo.
      if(playable){
        ctx.save();
        ctx.globalAlpha = .62;
        ctx.shadowColor = d.color;
        ctx.shadowBlur = 8 * dpr;
        ctx.strokeStyle = d.color;
        ctx.lineWidth = 1.9 * dpr;
        ctx.beginPath();
        ctx.arc(p.x, p.y, r * 1.28, 0, Math.PI * 2);
        ctx.stroke();

        ctx.shadowBlur = 0;
        ctx.globalAlpha = .52;
        ctx.strokeStyle = 'rgba(255,255,255,.62)';
        ctx.lineWidth = .9 * dpr;
        ctx.beginPath();
        ctx.arc(p.x, p.y, r * 1.15, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      }

      // SVG premium. Tamaño visual independiente del radio físico.
      const visualR = r * 1.40;
      if(sprite && sprite.complete && sprite.naturalWidth > 0){
        // Bloqueada más visible: no desaparece, porque sigue formando puertas.
        ctx.globalAlpha = blocked ? .78 : 1;
        ctx.drawImage(sprite, p.x - visualR, p.y - visualR, visualR * 2, visualR * 2);
      } else {
        ctx.globalAlpha = blocked ? .78 : 1;
        ctx.beginPath();
        ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
        ctx.fillStyle = d.color;
        ctx.fill();
        ctx.lineWidth = 2 * dpr;
        ctx.strokeStyle = 'white';
        ctx.stroke();
        ctx.fillStyle = 'white';
        ctx.font = `900 ${16*dpr}px system-ui`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(d.name, p.x, p.y);
      }

      // Velo de bloqueada más suave que antes.
      if(blocked){
        ctx.globalAlpha = .13;
        ctx.beginPath();
        ctx.arc(p.x, p.y, r * 1.13, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(2,6,23,.42)';
        ctx.fill();

        ctx.globalAlpha = .58;
        ctx.strokeStyle = 'rgba(203,213,225,.62)';
        ctx.lineWidth = 1.25 * dpr;
        ctx.beginPath();
        ctx.arc(p.x, p.y, r * 1.18, 0, Math.PI * 2);
        ctx.stroke();
      }

      // En modo Meta, la ficha completada queda marcada sobre sí misma.
      if(state.gameMode==='meta' && state.metaDone[d.id]){
        ctx.save();
        ctx.globalAlpha = 1;
        ctx.shadowColor = 'rgba(34,197,94,.85)';
        ctx.shadowBlur = 14*dpr;
        ctx.strokeStyle = 'rgba(34,197,94,.95)';
        ctx.lineWidth = 3*dpr;
        ctx.beginPath();
        ctx.arc(p.x, p.y, r*1.34, 0, Math.PI*2);
        ctx.stroke();
        ctx.fillStyle = 'rgba(34,197,94,.96)';
        ctx.beginPath();
        ctx.arc(p.x + r*.78, p.y - r*.78, r*.45, 0, Math.PI*2);
        ctx.fill();
        ctx.shadowBlur = 0;
        ctx.fillStyle = 'white';
        ctx.font = `900 ${Math.max(12*dpr, r*.62)}px system-ui`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('✓', p.x + r*.78, p.y - r*.80);
        ctx.restore();
      }

      ctx.restore();
    }
  }

  function showPassGlow(p){
    if(!p) return;
    state.passGlow = {
      x:p.x,
      y:p.y,
      start:performance.now(),
      dur:520
    };
  }

  function drawPassGlow(){
    const g = state.passGlow;
    if(!g) return;

    const elapsed = performance.now() - g.start;
    const t = Math.max(0, Math.min(1, elapsed / g.dur));
    if(t >= 1){
      state.passGlow = null;
      return;
    }

    const p = worldToScreen(g);
    const alpha = Math.sin(Math.PI * t);
    const r1 = (0.13 + 0.22*t) * scale;
    const r2 = (0.28 + 0.36*t) * scale;

    ctx.save();
    ctx.globalCompositeOperation = 'lighter';

    // Brillo pequeño en el punto exacto de cruce de la puerta.
    const rg = ctx.createRadialGradient(p.x,p.y,0,p.x,p.y,r2);
    rg.addColorStop(0, `rgba(255,255,255,${0.44*alpha})`);
    rg.addColorStop(.28, `rgba(250,204,21,${0.34*alpha})`);
    rg.addColorStop(1, 'rgba(250,204,21,0)');
    ctx.fillStyle = rg;
    ctx.beginPath();
    ctx.arc(p.x,p.y,r2,0,Math.PI*2);
    ctx.fill();

    ctx.strokeStyle = `rgba(255,255,255,${0.70*alpha})`;
    ctx.lineWidth = 1.35*dpr;
    ctx.beginPath();
    ctx.arc(p.x,p.y,r1,0,Math.PI*2);
    ctx.stroke();

    // Dos chispas diagonales muy breves: se lee como cruce, no como explosión.
    ctx.strokeStyle = `rgba(250,204,21,${0.62*alpha})`;
    ctx.lineWidth = 1.15*dpr;
    ctx.lineCap = 'round';
    const len = (0.16 + 0.08*t) * scale;
    ctx.beginPath();
    ctx.moveTo(p.x-len, p.y-len*.35);
    ctx.lineTo(p.x+len, p.y+len*.35);
    ctx.moveTo(p.x-len*.35, p.y+len);
    ctx.lineTo(p.x+len*.35, p.y-len);
    ctx.stroke();

    ctx.restore();
  }

  function drawAiming(){
    if(cfg.kickMode === 'dirforce'){
      drawDirForceAiming();
      return;
    }
    if(!state.drag || state.selected==null) return;
    const d=state.discs[state.selected], p=worldToScreen(d), c=worldToScreen(state.drag.current), s=worldToScreen(state.drag.start);
    const vx=c.x-s.x, vy=c.y-s.y;
    const pullPx=Math.hypot(vx,vy);
    const capPx=SLING_MAX_PULL*scale;
    const ratio=pullPx>0 ? Math.min(1, capPx/pullPx) : 1;
    const cvx=vx*ratio, cvy=vy*ratio;
    const end={x:p.x-cvx,y:p.y-cvy};
    const capPoint={x:s.x+cvx,y:s.y+cvy};
    ctx.save();
    ctx.strokeStyle='rgba(250,204,21,.95)'; ctx.lineWidth=5*dpr; ctx.lineCap='round';
    ctx.beginPath(); ctx.moveTo(p.x,p.y); ctx.lineTo(end.x,end.y); ctx.stroke();
    const ang=Math.atan2(end.y-p.y,end.x-p.x); const ah=14*dpr;
    ctx.beginPath(); ctx.moveTo(end.x,end.y); ctx.lineTo(end.x-Math.cos(ang-.55)*ah,end.y-Math.sin(ang-.55)*ah); ctx.lineTo(end.x-Math.cos(ang+.55)*ah,end.y-Math.sin(ang+.55)*ah); ctx.closePath(); ctx.fillStyle='rgba(250,204,21,.95)'; ctx.fill();
    ctx.beginPath(); ctx.arc(capPoint.x,capPoint.y,0.24*scale,0,Math.PI*2); ctx.fillStyle='rgba(255,255,255,.86)'; ctx.fill(); ctx.strokeStyle='rgba(15,23,42,.5)'; ctx.lineWidth=2*dpr; ctx.stroke();
    if(pullPx>capPx){
      ctx.setLineDash([5*dpr,5*dpr]);
      ctx.strokeStyle='rgba(255,255,255,.30)'; ctx.lineWidth=2*dpr;
      ctx.beginPath(); ctx.moveTo(capPoint.x,capPoint.y); ctx.lineTo(c.x,c.y); ctx.stroke();
    }
    ctx.restore();
  }

  function drawDirForceAiming(){
    if(state.selected==null || state.aimMode==='idle') return;
    const d=state.discs[state.selected], p=worldToScreen(d);
    const a = state.aimAngleFixed ?? state.aimAngle;
    const len = 1.45 * scale;
    const end = {x:p.x + Math.cos(a)*len, y:p.y + Math.sin(a)*len};
    const pulse = 0.5 + 0.5*Math.sin(performance.now()/1000*9);

    ctx.save();
    ctx.lineCap='round';
    ctx.shadowColor='rgba(250,204,21,.78)';
    ctx.shadowBlur=(10+6*pulse)*dpr;
    ctx.strokeStyle='rgba(250,204,21,.95)';
    ctx.lineWidth=5*dpr;
    ctx.beginPath(); ctx.moveTo(p.x,p.y); ctx.lineTo(end.x,end.y); ctx.stroke();
    const ah=14*dpr;
    ctx.beginPath();
    ctx.moveTo(end.x,end.y);
    ctx.lineTo(end.x-Math.cos(a-.55)*ah,end.y-Math.sin(a-.55)*ah);
    ctx.lineTo(end.x-Math.cos(a+.55)*ah,end.y-Math.sin(a+.55)*ah);
    ctx.closePath();
    ctx.fillStyle='rgba(250,204,21,.98)'; ctx.fill();

    ctx.shadowBlur=0;
    ctx.strokeStyle='rgba(255,255,255,.34)';
    ctx.lineWidth=1.3*dpr;
    ctx.beginPath(); ctx.arc(p.x,p.y,1.65*R*scale,0,Math.PI*2); ctx.stroke();
    ctx.restore();

    if(state.aimMode === 'force') drawForceBar();
  }

  function drawForceBar(){
    const w=Math.min(pxW*0.64, 290*dpr), h=22*dpr;
    const x=(pxW-w)/2, y=pxH-48*dpr;
    const t=Math.max(0, Math.min(1, state.forceValue));
    const r=h/2;
    ctx.save();

    // Panel compacto: no invade la cancha ni usa radios excesivos.
    ctx.fillStyle='rgba(2,6,23,.80)';
    roundRect(x-52*dpr,y-12*dpr,w+104*dpr,h+28*dpr,18*dpr,true,false);
    ctx.strokeStyle='rgba(255,255,255,.18)'; ctx.lineWidth=1.1*dpr;
    roundRect(x-52*dpr,y-12*dpr,w+104*dpr,h+28*dpr,18*dpr,false,true);

    ctx.font=`900 ${12*dpr}px system-ui`;
    ctx.textBaseline='middle';
    ctx.fillStyle='rgba(248,250,252,.92)';
    ctx.textAlign='right'; ctx.fillText('Débil', x-9*dpr, y+h/2);
    ctx.textAlign='left'; ctx.fillText('Fuerte', x+w+9*dpr, y+h/2);

    ctx.fillStyle='rgba(15,23,42,.90)';
    roundRect(x,y,w,h,r,true,false);

    const fillW=Math.max(0.01, w*t);
    const grad=ctx.createLinearGradient(x,0,x+w,0);
    grad.addColorStop(0,'rgba(34,197,94,.95)');
    grad.addColorStop(.55,'rgba(250,204,21,.95)');
    grad.addColorStop(1,'rgba(239,68,68,.95)');

    ctx.save();
    roundRect(x,y,w,h,r,false,false);
    ctx.clip();
    ctx.fillStyle=grad;
    ctx.fillRect(x,y,fillW,h);
    ctx.restore();

    ctx.strokeStyle='rgba(255,255,255,.70)'; ctx.lineWidth=1.3*dpr;
    roundRect(x,y,w,h,r,false,true);

    const kx=x+w*t;
    ctx.shadowColor='rgba(255,255,255,.90)'; ctx.shadowBlur=7*dpr;
    ctx.fillStyle='rgba(255,255,255,.96)';
    ctx.beginPath(); ctx.arc(kx,y+h/2,10*dpr,0,Math.PI*2); ctx.fill();
    ctx.strokeStyle='rgba(15,23,42,.72)'; ctx.lineWidth=2*dpr; ctx.stroke();
    ctx.restore();
  }

  function roundRect(x,y,w,h,r,fill,stroke){ctx.beginPath();ctx.moveTo(x+r,y);ctx.arcTo(x+w,y,x+w,y+h,r);ctx.arcTo(x+w,y+h,x,y+h,r);ctx.arcTo(x,y+h,x,y,r);ctx.arcTo(x,y,x+w,y,r);ctx.closePath();if(fill)ctx.fill();if(stroke)ctx.stroke();}
  function hexA(hex,a){const n=parseInt(hex.slice(1),16);return `rgba(${(n>>16)&255},${(n>>8)&255},${n&255},${a})`;}

  
  function complexityLabel(v){
    if(v<5) return '⭐ Básica';
    if(v<10) return '⭐⭐ Intermedia';
    if(v<20) return '⭐⭐⭐ Avanzada';
    if(v<35) return '⭐⭐⭐⭐ Experta';
    return '⭐⭐⭐⭐⭐ Legendaria';
  }

  function playCollisionSound(strength=1){
    const nowMs = performance.now();
    if(nowMs - state.lastCollisionSoundAt < 95) return;
    state.lastCollisionSoundAt = nowMs;
    playTone('collision', {strength});
  }
  Object.assign(window, {
    $,
    state,
    FIELD_W,
    FIELD_H,
    R,
    GOAL_W,
    GOAL_D,
    GOAL_TOP,
    WORLD_ART,
    isMetaWorldUnlocked,
    formatMetaTime,
    complexityLabel,
    saveMetaSeenWorld,
    worldEmblem,
    showScreen,
    setupMickey,
    recordTriangle,
    updateActionButtons,
    updateTriButton,
    updateHud,
    setStatus,
    playTone,
    draw,
    resize,
    canShowNextLevel,
    metaCount
  });

  resize(); draw();
})(window.CAMPAIGN_LEVELS);
