import moon from "../assets/destination/image-moon.png";
import mars from "../assets/destination/image-mars.png";
import europa from "../assets/destination/image-europa.png";
import titan from "../assets/destination/image-titan.png";

// Maps a destination's imageKey (from the API) to the bundled client asset.
// Images stay client-side; the API only ships the key.
const destinationImages = { moon, mars, europa, titan };

export default destinationImages;
