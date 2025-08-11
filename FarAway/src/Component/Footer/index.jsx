import {
    FaPhoneAlt,
    FaFacebookF,
    FaInstagram,
    FaWhatsapp,
    FaLine,
} from "react-icons/fa";
import { FaRegEnvelope } from "react-icons/fa";
import { RiMap2Line } from "react-icons/ri";
import { IoIosArrowForward } from "react-icons/io";

const quickLinks = [
    "Crewed Yachts",
    "Bareboat Yachts",
    "Day Trip Yachts",
    "Luxury Yachts",
    "Overnight Itineraries",
];

const usefulLinks = [
    "About Us",
    "Mission Statement",
    "FAQ",
    "Privacy policy",
    "Blog",
];

const iconClass = "text-[#D6AB61] ";
const textclass ="text-[16px] font-[400]";
const heading ="text-[28px] font-[600] mb-4";  
const Footer = () => {
    const renderLinks = (links) =>
        links.map((link, index) => (
            <li key={index} className="flex items-center gap-2 text-[16px] font-nomal">   
                <IoIosArrowForward className={iconClass} />
                {link}
            </li>
        ));

    return (
        <footer className="bg-[#004D5C] text-white pt-10">
            <div className="xl:px-0 px-4 xl:px-4 2xl:px-0 lg:max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-10 py-8 mb-14">
                {/* Column 1: Contact Info */}
                <div className="md:col-span-4">
                    <h3 className={heading}>
                        Faraway Yachting Co. Ltd.
                    </h3>
                    <div className="flex items-start gap-3 mb-2">
                        <FaPhoneAlt className={`mt-1 ${iconClass}`} />
                        <span className={textclass}>+66 61 234 5623</span>
                    </div>
                    <div className="flex items-start gap-3 mb-2">
                        <FaRegEnvelope className={`mt-1 ${iconClass}`} />
                        <span className={textclass}>info@far-away.net</span>
                    </div>
                    <div className="flex items-start gap-3">
                        <RiMap2Line size={20} className={`mt-1 ${iconClass}`} />
                        <span className="text-[16px] font-normal max-w-xs">
                            40/1 Chaofa Road, Moo 9 Tambon Chalong, Amphoe Mueang Phuket,
                            Chang Wat Phuket 83130
                        </span>
                    </div>

                    <div className="flex gap-4 mt-6">
                        {[FaFacebookF, FaInstagram, FaWhatsapp, FaLine].map((Icon, idx) => (
                            <a
                                key={idx}
                                href="#"
                                className="border border-white p-3 hover:bg-[#37ABC0] text-white"
                            >
                                <Icon className={iconClass} />
                            </a>
                        ))}
                    </div>
                </div>

                {/* Column 2: Quick Links */}
                <div className="md:col-span-2">
                    <h3 className={heading}>Quick Links</h3>
                    <ul className="space-y-3">{renderLinks(quickLinks)}</ul>
                </div>

                {/* Column 3: Useful Links */}
                <div className="md:col-span-2">
                    <h3 className={heading}>Useful Links</h3>
                    <ul className="space-y-3">{renderLinks(usefulLinks)}</ul>
                </div>

                {/* Column 4: Subscribe */}
                <div className="md:col-span-4">
                    <h3 className={heading}>Subscribe</h3>
                    <p className="text-[16px] font-normal mb-4" >
                        Subscribe to our newsletter to stay up-to-date with the latest news,
                        promotions, and insider tips on Phuket yacht charters!
                    </p>
                    <form className="space-y-2">
                        <input
                            type="text"
                            placeholder="Name"
                            className="w-full p-2 rounded bg-white text-black textclass"
                        />
                        <input
                            type="email"
                            placeholder="Email"
                            className="w-full p-2 rounded bg-white text-black textclass"
                        />
                        <button
                            type="submit"
                            className="w-full p-2 rounded bg-[#D6AB61] hover:bg-yellow-600 text-black font-semibold"
                        > 
                            Send
                        </button>
                    </form>
                </div>
            </div>

            {/* Footer Bottom Bar */}
            <div className="bg-[#333333] text-[20px] font-normal text-center textclass py-4">
                <p>© 2025 Copyright Faraway Yachting Co. Ltd.</p>
                <div className="flex justify-center text-lg font-normal mt-1 ">
                    {["Impressum ", "|","Sitemap "].map((item, index) => (
                        <a key={index} href="#" className="underline me-1">
                            {item}
                        </a>
                    ))}
                </div>
            </div>
        </footer>
    );
};

export default Footer;
