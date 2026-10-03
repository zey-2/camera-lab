const part = (name, description, connection, internal = true) => Object.freeze({name, description, connection, internal});
const shared = {
 lens: part('The lens', 'Curved glass forms an image from incoming light. A DSLR mirror redirects that image to the focusing screen while viewing.', 'Focus and focal length stay fixed; aperture changes the capture opening.', false),
 aperture: part('The aperture', 'Overlapping blades form an adjustable opening inside the lens.', 'A lower f-number admits more light and softens the background.'),
 shutter: part('The shutter', 'The shutter sets the interval during which light reaches the sensor.', 'A shorter interval reduces captured light and motion trails.'),
 sensor: part('The sensor', 'Light-sensitive sites convert photons into electrical signals.', 'ISO changes image brightness, never the incoming light.'),
 body: part('The camera body', 'The light-tight housing includes the grip, shutter button and external finder housing.', 'The housing keeps the optical components aligned.', false)
};
const definitions = {
 mirrorless: {...shared, evf: part('The electronic viewfinder', 'A display presents an electronic image from the sensor.', 'The sensor sends an electronic signal to the EVF; light does not travel through that signal path.')},
 dslr: {...shared,
  mirror: part('The reflex mirror', 'A lowered mirror redirects incoming light toward the focusing screen.', 'During exposure the mirror lifts to clear the sensor path.'),
  'focusing-screen': part('The focusing screen', 'The lens forms a viewing image on this screen above the mirror.', 'The prism relays this image to the optical finder.'),
  prism: part('The prism', 'The prism redirects the focusing-screen image toward the eyepiece.', 'This is an optical viewing path, separate from the exposure path.'),
  'optical-finder': part('The optical viewfinder', 'The eyepiece presents the optical image relayed by the prism.', 'It becomes dark when the mirror lifts for exposure.')}
};
const geometry = (anchor, explodedOffset, bounds) => Object.freeze({anchor:Object.freeze(anchor), explodedOffset:Object.freeze(explodedOffset), bounds:Object.freeze(bounds)});
// Local part coordinates are identical in every view. Only the exploded translation changes.
const shapes = {
 mirrorless: {
  outlinePath:'M0-57Q0-70 14-70H43L51-94H108L121-70H158Q183-70 193-47L198 82Q198 106 177 106H18Q0 106 0 88Z',
  cutawayPath:'M14-49H55V-80H101V-49H148V87H14Z',
  gripPath:'M157-61Q181-61 184-40L189 78Q190 95 174 96H156L150 5Z',
  geometry:{lens:geometry([235,195],[-110,70],[-104,-74,234,148]), aperture:geometry([308,195],[-17,70],[-24,-58,48,116]), shutter:geometry([467,195],[-31,70],[-12,-55,31,110]), sensor:geometry([491,195],[259,70],[-15,-55,35,110]), body:geometry([365,180],[157,-58],[-15,-99,216,208]), evf:geometry([442,113],[-22,-38],[-23,-15,46,30])}
 },
 dslr: {
  outlinePath:'M0-54Q0-70 18-70H39L57-111H107L137-70H188Q222-70 231-43L238 80Q239 106 216 106H18Q0 106 0 88Z',
  cutawayPath:'M14-49H51L66-97H100L123-49H188V87H14Z',
  gripPath:'M193-61Q220-61 221-35L229 76Q230 95 211 96H194L186 5Z',
  geometry:{lens:geometry([195,195],[-70,70],[-104,-74,234,148]), aperture:geometry([268,195],[23,70],[-24,-58,48,116]), shutter:geometry([480,195],[-44,70],[-12,-55,31,110]), sensor:geometry([505,195],[245,70],[-15,-55,35,110]), body:geometry([325,180],[157,-58],[-15,-114,256,223]), mirror:geometry([401,208],[-31,57],[-38,-42,76,84]), 'focusing-screen':geometry([404,134],[-36.3770491803279,11],[-43,-6,86,12]), prism:geometry([405,96],[-37.3770491803279,-21],[-29,-28,58,52]), 'optical-finder':geometry([484,116],[-59,-41],[-20,-15,40,30])}
 }
};
// Registration segments connect visible mating surfaces in the separated layout.
// The lifted housing is deliberately not connected to obsolete assembled positions.
const endpoint=(part,point)=>Object.freeze({part,point:Object.freeze(point)});
const guide=(id,from,fromPoint,to,toPoint)=>Object.freeze({id,from:endpoint(from,fromPoint),to:endpoint(to,toPoint)});
const sharedGuides=[
 guide('lens-aperture','lens',[129,0],'aperture',[-23,0]),
 guide('shutter-sensor','shutter',[18,0],'sensor',[-14,0])
];
const explodedGuides={
 mirrorless:[...sharedGuides,guide('aperture-shutter','aperture',[23,0],'shutter',[-11,0])],
 dslr:[...sharedGuides,
  guide('aperture-mirror','aperture',[23,0],'mirror',[-6.626666666666667,0]),
  guide('mirror-shutter','mirror',[7.52,0],'shutter',[-11,0]),
  guide('mirror-screen','mirror',[-29+29*56/61,0],'focusing-screen',[0,5]),
  guide('screen-prism','focusing-screen',[0,-5],'prism',[0,23]),
  guide('prism-finder','prism',[24.17391304347826,0],'optical-finder',[-19,0])]
};
/** @typedef {{id:string, kind:'light'|'signal', points:readonly (readonly number[])[]}} Path */
const path=(id,kind,points)=>Object.freeze({id,kind,points:Object.freeze(points.map(point=>Object.freeze(point)))});
// DSLR mirror hit is the intersection of y=195 and the authored reflective stroke
// (372,237) -> (428,176), not the mirror group's anchor. Prism bends are schematic.
const phasePaths={
 dslr:{
  viewing:[path('optical-viewing','light',[[120,195],[268,195],[410.55737704918,195],[410.55737704918,134],[410.55737704918,117],[395,100],[405,82],[418,112],[484,116]])],
  exposure:[path('capture-light','light',[[120,195],[268,195],[431,195],[480,195],[505,195]])]
 },
 mirrorless:{
  viewing:[path('sensor-light','light',[[160,195],[308,195],[467,195],[491,195]]),path('evf-signal','signal',[[491,195],[518,195],[518,113],[457,113]])],
  exposure:[path('capture-light','light',[[160,195],[308,195],[467,195],[491,195]]),path('evf-signal','signal',[[491,195],[518,195],[518,113],[457,113]])]
 }
};
const configs = Object.fromEntries(Object.entries(definitions).map(([type, parts]) => [type, Object.freeze({partIds:Object.freeze(Object.keys(parts)), parts:Object.freeze(parts), viewBox:Object.freeze([0,0,780,355]), ...shapes[type], geometry:Object.freeze(shapes[type].geometry),explodedGuides:Object.freeze(explodedGuides[type]),paths:Object.freeze({viewing:Object.freeze(phasePaths[type].viewing),exposure:Object.freeze(phasePaths[type].exposure)})})]));
export function getCameraConfig(type) {
 if (!Object.hasOwn(configs,type)) throw new RangeError('Unknown camera type');
 return configs[type];
}
