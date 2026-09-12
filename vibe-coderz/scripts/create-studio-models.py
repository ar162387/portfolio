"""Run with Blender --background --python scripts/create-studio-models.py.
Editable sources live in assets/blender; only GLBs and WebP posters ship.
"""
import bpy
import math
import json
from pathlib import Path
from mathutils import Vector, Matrix, Euler

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'public/models/studio'
OUT.mkdir(parents=True, exist_ok=True)
bpy.ops.wm.read_factory_settings(use_empty=True)

def material(name, hex_color, metallic=0.0, roughness=0.35):
    rgb = [int(hex_color[i:i+2], 16) / 255 for i in (0, 2, 4)]
    linear = [v / 12.92 if v <= .04045 else ((v + .055) / 1.055) ** 2.4 for v in rgb]
    m = bpy.data.materials.new(name)
    m.diffuse_color = (*linear, 1)
    m.use_nodes = True
    bsdf = m.node_tree.nodes.get('Principled BSDF')
    bsdf.inputs['Base Color'].default_value = (*linear, 1)
    bsdf.inputs['Metallic'].default_value = metallic
    bsdf.inputs['Roughness'].default_value = roughness
    return m

clay = material('Terracotta ceramic', 'C74929', .18, .29)
sage = material('Sage ceramic', '899475', .12, .34)
cream = material('Warm porcelain', 'E6DFCD', .12, .25)
ink = material('Graphite', '373B31', .28, .3)
brass = material('Champagne metal', 'B49B70', .55, .27)


def finish(obj, name, mat):
    obj.name = name
    obj.data.materials.append(mat)
    for face in obj.data.polygons:
        face.use_smooth = True
    return obj


def ball(name, loc, radius, mat):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=24, ring_count=12, radius=radius, location=loc)
    return finish(bpy.context.object, name, mat)


def ring(name, radius, tube, rotation, mat, loc=(0, 0, 0)):
    bpy.ops.mesh.primitive_torus_add(major_segments=64, minor_segments=10, location=loc,
                                   major_radius=radius, minor_radius=tube, rotation=rotation)
    return finish(bpy.context.object, name, mat)


def block(name, loc, scale, mat, bevel=.09, rotation=(0, 0, 0)):
    bpy.ops.mesh.primitive_cube_add(size=1, location=loc, rotation=rotation)
    obj = bpy.context.object
    obj.scale = scale
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    mod = obj.modifiers.new('Soft manufactured edges', 'BEVEL')
    mod.width = bevel
    mod.segments = 3
    bpy.ops.object.modifier_apply(modifier=mod.name)
    obj.modifiers.new('Weighted corner normals', 'WEIGHTED_NORMAL')
    return finish(obj, name, mat)


def rod(name, a, b, radius, mat):
    a, b = Vector(a), Vector(b)
    direction = b-a
    bpy.ops.mesh.primitive_cylinder_add(vertices=12, radius=radius, depth=direction.length, location=(a+b)/2)
    obj = bpy.context.object
    obj.rotation_euler = direction.to_track_quat('Z', 'Y').to_euler()
    return finish(obj, name, mat)


def gravity():
    # An opaque centre with a narrow photon rim and inward-curling light.
    core = material('Black centre', '10130D', 0, 1)
    bsdf = core.node_tree.nodes.get('Principled BSDF')
    bsdf.inputs['Specular IOR Level'].default_value = 0
    bsdf.inputs['Base Color'].default_value = (.0015, .0018, .0011, 1)
    bsdf.inputs['Emission Color'].default_value = (.006, .008, .004, 1)
    bsdf.inputs['Emission Strength'].default_value = 1
    bpy.ops.mesh.primitive_uv_sphere_add(segments=64, ring_count=32, radius=1)
    finish(bpy.context.object, 'Black_centre', core)
    size = 512
    texture = bpy.data.images.new('Horizon light field', width=size, height=size, alpha=True)
    pixels = []
    for y in range(size):
        for x in range(size):
            u, v = (x+.5-size/2)/size*3.3, (y+.5-size/2)/size*3.3
            radius, angle = math.hypot(u,v), math.atan2(v,u)
            rim = math.exp(-((radius-1.016)/.016)**2)
            glow = math.exp(-((radius-1.065)/.14)**2)
            phase = angle*7 + math.log(max(radius,1))*38
            flow = (.5+.5*math.sin(phase))**7 * math.exp(-((radius-1.16)/.18)**2)
            alpha = min(1,rim+glow*.66+flow*.42) * (.85+.15*math.sin(angle-.4)) if radius >= .995 else 0
            pixels.extend((.64+.36*rim,.3+.42*rim,.06+.22*rim,alpha))
    texture.pixels.foreach_set(pixels)
    texture.pack()
    horizon = material('Horizon radiance', 'EAC080', 0, 1)
    horizon.surface_render_method = 'BLENDED'
    nodes, links = horizon.node_tree.nodes, horizon.node_tree.links
    image = nodes.new('ShaderNodeTexImage')
    image.image = texture
    shader = nodes.get('Principled BSDF')
    links.new(image.outputs['Color'],shader.inputs['Base Color'])
    links.new(image.outputs['Color'],shader.inputs['Emission Color'])
    links.new(image.outputs['Alpha'],shader.inputs['Alpha'])
    shader.inputs['Emission Strength'].default_value = .4
    bpy.ops.mesh.primitive_plane_add(size=3.3,rotation=(math.pi/2,0,0))
    finish(bpy.context.object,'Horizon_light',horizon)
    path_material = material('Fine orbital paths', '7E866E', 0, 1)
    particle_material = material('Orange orbital particles', 'C94E29', 0, .65)
    conversion = Matrix(((1,0,0),(0,0,1),(0,-1,0)))
    orbits = [('horizontal',1.65,(1.10,.15,-.35)),
              ('vertical',2.02,(.12,1.08,.35)),
              ('diagonal',2.32,(.8,.45,-.6))]
    for i, (name, radius, orientation) in enumerate(orbits):
        pivot = bpy.data.objects.new('Orbit_'+name, None)
        bpy.context.collection.objects.link(pivot)
        bpy.ops.mesh.primitive_torus_add(major_segments=96, minor_segments=6,
            major_radius=radius, minor_radius=.007, rotation=(math.pi/2,0,0))
        path = finish(bpy.context.object, 'Path_'+name, path_material)
        path.parent = pivot
        for j in range(4):
            angle = j*math.pi/2 + i*.42
            bpy.ops.mesh.primitive_uv_sphere_add(segments=16, ring_count=8, radius=.027,
                location=(radius*math.cos(angle),0,radius*math.sin(angle)))
            particle = finish(bpy.context.object, 'Particle_%d_%d' % (i,j), particle_material)
            particle.parent = pivot
        pivot.rotation_euler = (conversion.transposed() @ Euler(orientation,'XYZ').to_matrix() @ conversion).to_euler()


def principles():
    # Three continuous rings share topology across all three chapter poses.
    ball('Principle_centre', (0,0,0), .27, brass)
    segments, sides = 96, 8
    def coordinates(index, stage):
        if stage == 0:
            rx, rz, exponent = .68, 1.04, 1.0
            rotation = Euler((.12*(index-1), (index-1)*.6, .12*(index-1)), 'XYZ').to_matrix()
            offset = Vector(((index-1)*.3, (index-1)*.08, 0))
        elif stage == 1:
            scale = [1,.74,.5][index]
            rx, rz, exponent = .92*scale, .92*scale, .23
            rotation = Euler((0,math.pi/4,0),'XYZ').to_matrix()
            offset = Vector((0,(index-1)*.1,0))
        else:
            rx, rz, exponent = .34, 1.12, 1.0
            rotation = Euler((.14*(index-1),(index-1)*math.pi/3,0),'XYZ').to_matrix()
            offset = Vector((0,(index-1)*.07,0))
        def centre(t):
            c, z = math.cos(t), math.sin(t)
            return Vector((rx*math.copysign(abs(c)**exponent,c),0,rz*math.copysign(abs(z)**exponent,z)))
        vertices=[]
        for j in range(segments):
            t=j*math.tau/segments
            point=centre(t)
            tangent=(centre(t+.0001)-centre(t-.0001)).normalized()
            normal=Vector((tangent.z,0,-tangent.x))
            for k in range(sides):
                angle=k*math.tau/sides
                tube=(normal*math.cos(angle)+Vector((0,1,0))*math.sin(angle))*.035
                vertices.append(rotation@(point+tube)+offset)
        return vertices
    faces=[]
    for j in range(segments):
        for k in range(sides):
            faces.append((j*sides+k, ((j+1)%segments)*sides+k,
                          ((j+1)%segments)*sides+(k+1)%sides, j*sides+(k+1)%sides))
    for i in range(3):
        mesh=bpy.data.meshes.new('Principle ring topology')
        mesh.from_pydata(coordinates(i,0),[],faces)
        mesh.update()
        obj=bpy.data.objects.new('Principle_ring_%d'%i,mesh)
        bpy.context.collection.objects.link(obj)
        finish(obj,obj.name,[sage,clay,cream][i])
        obj.shape_key_add(name='Basis')
        for stage,name in [(1,'Clarity'),(2,'Craft')]:
            key=obj.shape_key_add(name=name)
            for vertex,position in zip(key.data,coordinates(i,stage)):
                vertex.co=position


def look_at(obj, target=(0, 0, 0)):
    obj.rotation_euler = (Vector(target)-obj.location).to_track_quat('-Z', 'Y').to_euler()


manifest = []
for name, builder in [('gravity', gravity), ('principles', principles)]:
    scene = bpy.data.scenes.new(name)
    bpy.context.window.scene = scene
    builder()
    # Apply modifiers and join by material: a few draw calls, no texture downloads.
    for mat in ([] if name in ("gravity", "principles") else list(bpy.data.materials)):
        objects = [o for o in scene.objects if o.type == 'MESH' and len(o.data.materials) == 1 and o.data.materials[0] == mat]
        if not objects:
            continue
        bpy.ops.object.select_all(action='DESELECT')
        for o in objects:
            o.select_set(True)
            bpy.context.view_layer.objects.active = o
            bpy.ops.object.convert(target='MESH')
        bpy.context.view_layer.objects.active = objects[0]
        bpy.ops.object.join()
        bpy.context.object.name = mat.name
    bpy.ops.object.select_all(action='SELECT')
    bpy.ops.export_scene.gltf(filepath=str(OUT / (name+'.glb')), export_format='GLB', use_selection=True,
                             export_texcoords=name == 'gravity', export_normals=True, export_animations=False, export_morph=True,
                             export_cameras=False, export_lights=False, export_yup=True)
    tris = sum(len(o.data.loop_triangles) for o in scene.objects if o.type == 'MESH')
    # Match the website's orthographic camera and transparent composition.
    bpy.ops.object.camera_add(location=(0, -7, 0))
    camera = bpy.context.object
    look_at(camera)
    camera.data.type = 'ORTHO'
    camera.data.ortho_scale = 5.2 if name == 'gravity' else 4.2
    scene.camera = camera
    for loc, power, size in [((2, -4, 6), 600, 5), ((-4, -2, 2), 400, 4), ((2, 4, 3), 700, 3)]:
        bpy.ops.object.light_add(type='AREA', location=loc)
        light = bpy.context.object
        light.data.energy = power
        light.data.shape = 'DISK'
        light.data.size = size
        look_at(light)
    scene.world = bpy.data.worlds.new(name+' lighting')
    scene.world.use_nodes = True
    scene.world.node_tree.nodes['Background'].inputs[0].default_value = (.7, .72, .65, 1)
    scene.world.node_tree.nodes['Background'].inputs[1].default_value = .45
    scene.render.engine = 'CYCLES'
    scene.cycles.samples = 20
    scene.cycles.use_denoising = True
    scene.render.film_transparent = True
    scene.render.resolution_x = 800 if name == 'gravity' else 640
    scene.render.resolution_y = scene.render.resolution_x
    scene.render.resolution_percentage = 100
    scene.render.image_settings.file_format = 'PNG'
    for stage in range(3 if name == 'principles' else 1):
        if name == 'principles':
            for obj in scene.objects:
                if obj.type == 'MESH' and obj.data.shape_keys:
                    obj.data.shape_keys.key_blocks['Clarity'].value = 1 if stage == 1 else 0
                    obj.data.shape_keys.key_blocks['Craft'].value = 1 if stage == 2 else 0
        scene.render.filepath = str(OUT / ((name+'-'+str(stage) if name == 'principles' else name)+'.png'))
        bpy.ops.render.render(write_still=True)
    if name == 'principles':
        for obj in scene.objects:
            if obj.type == 'MESH' and obj.data.shape_keys:
                for key in obj.data.shape_keys.key_blocks:
                    key.value=0
    manifest.append({'name': name, 'bytes': (OUT/(name+'.glb')).stat().st_size, 'triangles': tris})

bpy.context.window.scene = bpy.data.scenes['gravity']
bpy.context.preferences.filepaths.save_version = 0
bpy.ops.wm.save_as_mainfile(filepath=str(ROOT / 'assets/blender/studio-sculptures.blend'))
(OUT/'manifest.json').write_text(json.dumps(manifest, indent=2)+'\n')
print('STUDIO_MODELS_COMPLETE', json.dumps(manifest))
