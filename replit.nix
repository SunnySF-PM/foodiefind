{ pkgs }: {
  deps = [
    pkgs.nodejs-20_x
    pkgs.nodePackages.nodemon
    pkgs.python3
    pkgs.python3Packages.pip
  ];
}