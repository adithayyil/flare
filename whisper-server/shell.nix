{ pkgs ? import <nixpkgs> {} }:

pkgs.mkShell {
  packages = with pkgs; [
    python3
    uv
  ];

  LD_LIBRARY_PATH = pkgs.lib.makeLibraryPath (with pkgs; [
    stdenv.cc.cc.lib
    ffmpeg
  ]);

  shellHook = ''
    if [ ! -d .venv ]; then
      uv venv
    fi
    source .venv/bin/activate
  '';
}
