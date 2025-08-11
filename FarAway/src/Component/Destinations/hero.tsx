const HeroSection = () => {

    return (
        <div>
            <div className="bg-[url('/images/hero.png')] bg-cover bg-center bg-no-repeat min-h-[40vh] sm:min-h-[50vh] md:min-h-[58vh] flex flex-col justify-center items-center ">
                <div className="text-center ">
                    <p className="text-white xl:text-[28px] md:text-[24px] text-[20px] font-extrabold">DESTINATIONS</p>
                    <p className="text-white xl:text-[56px] lg:text-[48px] md:text-[44px] text-[38px] pt-4 font-normal">Our Destinations In Phuket</p>
                </div>
            </div>
            <p className="text-lg font-normal text-center text-[#034250] max-w-6xl mx-auto py-11">Experience the epitome of luxury with Far Away Yachting’s private yacht in Phuket. Explore our magical destinations like Phi Phi Islands, the breathtaking Phang Nga Bay, and more in unparalleled style & comfort. Embark on a bareboat charter or indulge in a fully crewed experience, tailored to your desires.</p>
        </div>
        
    )

}
export default HeroSection