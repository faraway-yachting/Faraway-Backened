import { FaPhoneAlt, FaFacebook, FaInstagram, FaTiktok } from "react-icons/fa";
import { MdOutlineEmail } from "react-icons/md";
import { BsFillSendFill } from "react-icons/bs";
import { FaLinkedin } from "react-icons/fa6";
import { IoLogoTwitter } from "react-icons/io";

const Header = () => {
    return (
        <div className="bg-[#034250] hidden md:block">
            <div className="flex flex-col md:flex-row justify-between items-center max-w-7xl mx-auto text-white text-sm px-4 xl:px-0 py-4">
                <div className="flex flex-col md:flex-row items-center gap-2 md:gap-4 lg:gap-6">
                    <p className="flex items-center text-sm gap-2">
                        <FaPhoneAlt /> +66 61 2345623
                    </p>
                    <p className="flex items-center text-sm gap-2">
                        <MdOutlineEmail /> info@far-away.net
                    </p>
                    <p className="flex items-center text-sm gap-2">
                        <BsFillSendFill /> 40/1 Moo 9 Chalong Phuket
                    </p>
                </div>
                <div className="flex items-center gap-4 mt-2 md:mt-0">
                    <FaFacebook size={20} className="cursor-pointer hover:text-gray-300" />
                    <FaInstagram size={20} className="cursor-pointer hover:text-gray-300" />
                    <FaTiktok size={20} className="cursor-pointer hover:text-gray-300" />
                    <FaLinkedin size={20} className="cursor-pointer hover:text-gray-300" />
                    <IoLogoTwitter size={20} className="cursor-pointer hover:text-gray-300" />
                </div>
            </div>
        </div>
    );
};

export default Header;
