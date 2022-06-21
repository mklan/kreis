/**
 * Welcome to your Workbox-powered service worker!
 *
 * You'll need to register this file in your web app and you should
 * disable HTTP caching for this file too.
 * See https://goo.gl/nhQhGp
 *
 * The rest of the code is auto-generated. Please don't update this file
 * directly; instead, make changes to your Workbox build configuration
 * and re-run your build process.
 * See https://goo.gl/2aRDsh
 */

importScripts("https://storage.googleapis.com/workbox-cdn/releases/4.3.1/workbox-sw.js");

workbox.core.skipWaiting();

workbox.core.clientsClaim();

/**
 * The workboxSW.precacheAndRoute() method efficiently caches and responds to
 * requests for URLs in the manifest.
 * See https://goo.gl/S9QRab
 */
self.__precacheManifest = [
  {
    "url": "icon-128x128.9b3060a8.png",
    "revision": "86a8be0ac5a83004dde7f37b98bc99e8"
  },
  {
    "url": "icon-144x144.87173e1a.png",
    "revision": "731e01f2deea2c6668ecedd4464d3f9a"
  },
  {
    "url": "icon-152x152.c9c40f47.png",
    "revision": "0aa69134f0d0155842c2d0b40b3c1f40"
  },
  {
    "url": "icon-192x192.afc46268.png",
    "revision": "a22fb849947986d3f79263013153431f"
  },
  {
    "url": "icon-512x512.b7ddeaff.png",
    "revision": "0b608bb7ba4541d6faf9bea28094ace7"
  },
  {
    "url": "icon-72x72.ee4f2c4b.png",
    "revision": "c37945f09e54f0321bd1e7a5e2339ec9"
  },
  {
    "url": "index.html",
    "revision": "7b0aec77fc13dc43a535e671340f0467"
  },
  {
    "url": "src.1b07ae9f.css",
    "revision": "843e35083ff57f7280e4cd21f0120094"
  },
  {
    "url": "src.5f4cf719.js",
    "revision": "447d0f628db49a662db9ad22a87683d2"
  },
  {
    "url": "/",
    "revision": "6eda5994c5a01dc1c7ade56226d2c9e2"
  }
].concat(self.__precacheManifest || []);
workbox.precaching.precacheAndRoute(self.__precacheManifest, {});

workbox.routing.registerNavigationRoute(workbox.precaching.getCacheKeyForURL("./index.html"));
