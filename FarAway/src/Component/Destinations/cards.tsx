"use client";
import CardData from "../../data/destinationCards";
import Image from "next/image";

const Cards = () => {
  return (
    <div className="bg-white">
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 ">
          {CardData.map((item, index) => (
            <div
              key={index}
              className="group overflow-hidden rounded-lg transition-transform duration-300 hover:shadow-2xl hover:scale-[1.03] mt-10 bg-white hover:ps-2"
            >
              <div className="relative">
                <Image
                  src={item.image}
                  alt="card"
                  width={380}
                  height={100}
                  className="object-cover rounded-tl-4xl rounded-br-4xl"
                />
                <div className="absolute bottom-0 bg-opacity-50 w-full text-white px-4 py-2">
                  <h1 className="text-foreground transition-all duration-300">
                    {item.title}
                  </h1>
                </div>
              </div>

              <div className="p-4 flex flex-col justify-between h-[180px]"> {/* adjust height as needed */}
                <p >{item.description}</p>
                <div className="flex justify-between items-center mt-2">
                  <p className="text-[#2073A9] text-[21px] font-extrabold underline cursor-pointer">
                Read More
                  </p>
                  <button className="border text-[19px] border-[#C3974C] text-[#C3974C] px-6 py-1 rounded-lg hover:bg-[#C3974C] hover:text-white transition">
                    Contact Us
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Cards;
