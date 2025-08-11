import Cards from "@/Component/Destinations/cards";
import HeroSection from "@/Component/Destinations/hero";
import JoinUs from "@/Component/Destinations/joinus";
import { Fragment } from "react"

const Destinations= () => {
    return (
     <Fragment>
        <HeroSection />
        <Cards />
        <JoinUs />
     </Fragment>

    )

}
export default Destinations