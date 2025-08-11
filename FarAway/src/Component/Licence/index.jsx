import Image from "next/image";
import PngIcons from "@/icons/pngIcon";

const Licence = () => {
    const certificates = [
        PngIcons.Certificate2,
        PngIcons.Certificate3,
        PngIcons.Certificate4,
        PngIcons.Certificate5,
        PngIcons.Certificate6,
        PngIcons.Certificate7,

    ];

    return (
        <div className="bg-white pt-7">
            <div className="flex flex-col justify-center items-center text-center mb-6">
                <p className="text-xl font-bold mb-2 underline text-[#034250] text-[24px] uppercase">Booking terms and conditions</p>
                <Image src={PngIcons.Certificate1} height={100} width={150} alt="Certificate 1" className="mt-12" />
                <p className="mt-3 text-lg font-normal">Tourism Authority Thailand OTD Licence #34/02546</p>
            </div>

            <div className="flex justify-center items-center gap-7 bg-[#F6F6F6] w-full pt-2 pb-5">
                {certificates.map((icon, index) => (
                    <Image key={index} src={icon} alt={`Certificate ${index + 2}`} height={70} width={110} />
                ))}
            </div>
        </div>
    );
};

export default Licence;
