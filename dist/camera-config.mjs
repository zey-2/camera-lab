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
const configs = Object.fromEntries(Object.entries(definitions).map(([type, parts]) => [type, Object.freeze({partIds:Object.freeze(Object.keys(parts)), parts:Object.freeze(parts)})]));
export function getCameraConfig(type) {
 if (!Object.hasOwn(configs,type)) throw new RangeError('Unknown camera type');
 return configs[type];
}
