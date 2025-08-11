import PngIcons from "@/icons/pngIcon";
export interface cardsData {
    id: number;
    image: any;
    title: string;
    description: string;
}
 const CardData: cardsData[] = [
    {
        id: 1,
        title: "Phi Phi Islands",
        image: PngIcons.image1,
        description: "The Phi Phi Islands are situated in the Andaman Sea and are famous for natural beauty and rich marine life. This is a group of  islands ...",
    },
      {
        id: 2,
        title: "Phang Nga Bay",
        image: PngIcons.image2,
        description: "Phang Nga Bay is a tropical paradise. Nestled in the Andaman Sea between Phuket and the southern Thailand mainland, ...",
    },
       {
        id: 3,
        title: "Racha Islands",
        image: PngIcons.image3,
        description: "The Phi Phi Islands are situated in the Andaman Sea and are famous for natural beauty and rich marine life. This is a group of  islands ...",
    },   {
        id: 4,
        title: "Maithon Island",
        image: PngIcons.image4,
        description: "Maithon Island, also known as Koh Mai Thon, located off the southeast coast of Phuket, Thailand It is only 15 minutes by speedboat ...",
    },   {
        id: 5,
        title: "Koh Haa",
        image: PngIcons.image5,
        description: "Koh Haa, located in the Andaman Sea, is a stunning marine paradise with captivating underwater scenery, a variety of marine ...",
    },   {
        id: 6,
        title: "Koh Muk",
        image: PngIcons.image6,
        description: "Koh Mukis quite a hidden gem for any adventurer. This beautiful island offers an unforgettable experience to every visitor with its appealing...",
    },   {
        id: 7,
        title: "Koh Kradan",
        image: PngIcons.image7,
        description: "Koh Kradana hidden gem in Thailands Trang Province, is a dream destination for nature enthusiasts and marine lovers...",
    },   {
        id: 1,
        title: "Koh Lanta",
        image: PngIcons.image8,
        description: "Koh Lanta, an idyllic island situated in the Andaman Sea, is a hidden gem renowned for its unspoiled beaches, colorful marine ...",
    },   {
        id: 1,
        title: "Koh Rok",
        image: PngIcons.image9,
        description: "Koh Rok, composed of two islands—Koh Rok Nok and Koh Rok Nai—is situated in the Andaman Sea, just south of Koh Lanta. This twin isl...",
    },
]
export default CardData;