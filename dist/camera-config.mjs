const part = (name, description, connection, internal = true) => Object.freeze({name, description, connection, internal});
const shared = {
 lens: part('The lens', 'Curved glass focuses incoming light onto the sensor.', 'Focus and focal length stay fixed; aperture changes the capture opening.', false),
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
  geometry:{lens:geometry([235,195],[-110,70],[-104,-74,234,148]), aperture:geometry([308,195],[-23,70],[-24,-58,48,116]), shutter:geometry([467,195],[28,90],[-12,-55,31,110]), sensor:geometry([491,195],[114,90],[-15,-55,35,110]), body:geometry([365,180],[165,-35],[-15,-99,216,208]), evf:geometry([442,113],[-37,-63],[-23,-15,46,30])}
 },
 dslr: {
  outlinePath:'M0-54Q0-70 18-70H39L57-111H107L137-70H188Q222-70 231-43L238 80Q239 106 216 106H18Q0 106 0 88Z',
  cutawayPath:'M14-49H51L66-97H100L123-49H188V87H14Z',
  gripPath:'M193-61Q220-61 221-35L229 76Q230 95 211 96H194L186 5Z',
  geometry:{lens:geometry([195,195],[-70,70],[-104,-74,234,148]), aperture:geometry([268,195],[17,70],[-24,-58,48,116]), shutter:geometry([480,195],[15,90],[-12,-55,31,110]), sensor:geometry([505,195],[100,90],[-15,-55,35,110]), body:geometry([325,180],[165,-35],[-15,-114,256,223]), mirror:geometry([401,208],[-1,62],[-38,-42,76,84]), 'focusing-screen':geometry([404,134],[-64,-12],[-43,-6,86,12]), prism:geometry([405,96],[-47,-50],[-29,-28,58,52]), 'optical-finder':geometry([484,116],[-24,-63],[-20,-15,40,30])}
 }
};
const configs = Object.fromEntries(Object.entries(definitions).map(([type, parts]) => [type, Object.freeze({partIds:Object.freeze(Object.keys(parts)), parts:Object.freeze(parts), viewBox:Object.freeze([0,0,780,355]), ...shapes[type], geometry:Object.freeze(shapes[type].geometry)})]));
export function getCameraConfig(type) {
 if (!Object.hasOwn(configs,type)) throw new RangeError('Unknown camera type');
 return configs[type];
}
