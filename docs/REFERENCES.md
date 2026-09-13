# Photography references

Primary references checked by the research agent on 13 September 2026.

- [Nikon: Understanding Maximum Aperture](https://www.nikonusa.com/learn-and-explore/c/tips-and-techniques/understanding-maximum-aperture): lower f-numbers mean a wider opening, more light, and shallower depth of field. Depth comparisons assume fixed focal length and focus distance.
- [Nikon: A Basic Look at the Basics of Exposure](https://www.nikonusa.com/learn-and-explore/c/tips-and-techniques/a-basic-look-at-the-basics-of-exposure): exposure time changes captured light and the rendering of motion. A stop represents a doubling or halving.
- [Adobe: The Lowdown on Using High ISO Settings in Photography](https://blog.adobe.com/en/publish/2023/04/20/lowdown-using-high-iso-settings-in-photography): signal amplification is a useful ISO analogy. Sensor sensitivity and noise behavior need more nuance than an ISO-only causal rule.
- [Canon: How Digital Cameras Work](https://global.canon/en/technology/canon-tech/tech/dslr/): sensors convert light into signals, and processors form image data. Mirror/prism optical viewfinders describe DSLR systems; the app's simplified camera omits those parts.

## Educational model

With shutter duration t, f-number N, and ISO i:

    lightRatio = (t / (1 / 125)) * (4 / N) ** 2
    brightnessRatio = lightRatio * (i / 400)
    brightnessStops = Math.log2(brightnessRatio)

These are the application's illustrative equations, derived from exposure-stop relationships. The full brightness ratio must not be described as captured photons: the light ratio is independent of ISO.

Depth blur should chiefly affect a background plane; motion blur should affect the moving target; noise is a teaching illustration. The optical target and meters are not predictions for a specific real camera or scene.

## Manual demo sequence

1. Select the aperture in the camera diagram, then separate the components.
2. Change f/4 to f/8 and observe a two-stop decrease in light with greater depth of field.
3. Raise ISO from 400 to 1600; brightness returns while captured light remains lower.
4. Select the motion challenge and find a faster shutter with compensating settings.
5. Reset and reassemble to demonstrate the complete workflow.
