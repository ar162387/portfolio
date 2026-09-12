# Hero and studio models

Only the home-page hero and Studio's “The way we think” use WebGL.
Services retain their original artwork.

## Design

- **Gravity:** an opaque black centre with a narrow golden photon rim and animated light filaments curling inward. Three dark sage orbital paths and orange particles are exported from Blender on named pivots. Their planes revolve around horizontal, vertical, and diagonal axes while particles independently travel along each path. Depth testing hides paths, orange markers, and their halos only when they pass behind the centre; foreground dots remain visible across the black disc. The static Blender poster uses the same physical depth occlusion. Coordinates, stars, and reference axes retain the original layout.
- **Studio principles:** one fixed gold ball and the same three rings throughout. Blender shape keys move the rings from fanned ovals (Curiosity), to nested rounded diamonds (Clarity), to crossed narrow ovals (Craft), matching the original diagram. The model and camera remain mounted between chapters.

## Editable source

Open `assets/blender/studio-sculptures.blend` in Blender. Each model has its own named scene, camera, lighting, and materials. This source is outside `public` and is not downloaded by website visitors.

To regenerate on this Mac:

```sh
/Applications/Blender.app/Contents/MacOS/Blender --background --python scripts/create-studio-models.py
node scripts/convert-model-posters.mjs
```

On other systems, replace the Blender executable path with `blender`. The poster converter uses Sharp included with this Next.js installation. Model geometry, materials, and shape keys ship as self-contained GLBs; generated PNG previews are converted to WebP and removed. `public/models/studio/manifest.json` records actual file sizes and triangle counts.

## Browser behavior

`ModelVisual.tsx` displays a Blender-rendered poster immediately. Three.js and the selected GLB load when the model approaches the viewport. Save-data connections keep the poster. WebGL failure, model download failure, and context loss also leave the poster visible.

Animation draws at most 30 frames per second at a pixel ratio capped at 1.5. Rendering stops off-screen, in hidden tabs, when site motion is off, or when reduced motion is requested. The hero has its own pause control. Studio chapters change every 1.5 seconds while visible and continue during hover or keyboard focus. Clicking a chapter immediately transitions to it and restarts the full 1.5-second countdown, including when reselecting the active chapter. Autoplay then advances from that selection. Each ring transition takes 0.9 seconds, matching the original diagram timing. Reduced motion selects each pose immediately. The centre ball never moves; the rings morph in place and the renderer stops drawing between transitions. Resources are disposed on navigation/model changes.

To replace a model, export the matching scene as GLB and update its WebP poster together. Both cameras are front-facing and orthographic. Keep the hero centred at the origin and preserve its `Orbit_horizontal`, `Orbit_vertical`, `Orbit_diagonal`, `Path_*`, and `Particle_i_j` node names. The three orbit definitions in `model-runtime.ts` control their radii, starting angles, and rotation speeds. Preserve the `Horizon_light` disc and its UVs; `horizon-material.ts` animates the inward-flowing light on this surface. Keep the studio model centred at the origin. Preserve its three ring meshes, their `Clarity` and `Craft` shape keys, and the separate `Principle_centre` mesh. Its single `principles.glb` has matching `principles-0.webp`, `principles-1.webp`, and `principles-2.webp` fallback posters.

References: [Blender glTF pipeline](https://www.blender.org/features/pipeline/), [Three.js GLTFLoader](https://threejs.org/docs/pages/GLTFLoader.html).
