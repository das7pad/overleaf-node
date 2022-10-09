overleaf/web
==============

overleaf/web is the front-end web service of the open-source web-based collaborative LaTeX editor,
[Overleaf](https://www.overleaf.com).
It serves all the HTML pages, CSS and javascript to the client. overleaf/web also contains
a lot of logic around creating and editing projects, and account management.


The rest of the Overleaf stack, along with information about contributing can be found in the
[overleaf/overleaf](https://github.com/overleaf/overleaf) repository.

Build process
----------------

overleaf/web uses [esbuild](https://esbuild.github.io/) to build its front-end related assets.

### Running the frontend

The app runs natively using npm and Node on the local system:

```
$ npm ci
$ make esbuild_serve
```

### Running Tests

To run all tests run:
```
make test
```

License and Credits
-------------------

This project is licensed under the [AGPLv3 license](http://www.gnu.org/licenses/agpl-3.0.html)

### Stylesheets

Overleaf is based on [Bootstrap](http://getbootstrap.com/), which is licensed under the
[MIT license](http://opensource.org/licenses/MIT).
All modifications (`*.less` files in `frontend/stylesheets`) are also licensed
under the MIT license.
