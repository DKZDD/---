import "dotenv/config";
import { sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { videos, type NewVideo } from "./schema";

const BUCKET = "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample";

const seed: NewVideo[] = [
  {
    title: "Lágrimas de Aço",
    description:
      "Quarenta anos após um apocalipse robótico, um grupo de cientistas e resistentes se reúne numa Amsterdã devastada para encenar o evento que mudou o mundo — e, talvez, reescrevê-lo. Um épico de ficção científica sobre memória, culpa e recomeços.",
    category: "Ficção Científica",
    videoUrl: `${BUCKET}/TearsOfSteel.mp4`,
    thumbUrl: "/images/posters/lagrimas-de-aco.jpg",
    year: 2012,
    durationSec: 734,
    rating: "14",
    source: "url",
    featured: true,
    views: 48210,
  },
  {
    title: "Sintel: A Busca",
    description:
      "Uma jovem guerreira atravessa montanhas geladas e desertos implacáveis em busca do filhote de dragão que um dia salvou — e que lhe foi arrancado. Uma jornada de fantasia sobre amizade e a coragem de nunca desistir.",
    category: "Fantasia",
    videoUrl: `${BUCKET}/Sintel.mp4`,
    thumbUrl: "/images/posters/sintel.jpg",
    year: 2010,
    durationSec: 888,
    rating: "12",
    source: "url",
    views: 35120,
  },
  {
    title: "O Grande Coelho",
    description:
      "Numa manhã perfeita de campo, um coelho gigante e bonachão só queria apreciar as borboletas. Mas três roedores muito mal-humorados decidem transformar o dia dele num inferno. Ele está prestes a provar que até os mais gentis têm limites.",
    category: "Animação",
    videoUrl: `${BUCKET}/BigBuckBunny.mp4`,
    thumbUrl: "/images/posters/o-grande-coelho.jpg",
    year: 2008,
    durationSec: 596,
    rating: "L",
    source: "url",
    views: 61480,
  },
  {
    title: "Sonho de Elefantes",
    description:
      "Proog e Emo exploram os corredores infinitos de uma máquina colossal e viva. Um deles vê maravilhas em cada engrenagem; o outro, apenas prisão. Uma viagem surrealista sobre imaginação e os mundos que escolhemos enxergar.",
    category: "Ficção Científica",
    videoUrl: `${BUCKET}/ElephantsDream.mp4`,
    thumbUrl: "/images/posters/sonho-de-elefantes.jpg",
    year: 2006,
    durationSec: 653,
    rating: "12",
    source: "url",
    views: 28760,
  },
  {
    title: "Chamas do Destino",
    description:
      "Quando um incêndio gigantesco consome um depósito industrial, uma equipe de bombeiros de elite precisa entrar no coração do inferno para resgatar os seus. Cada segundo conta quando o fogo é o único que dita as regras.",
    category: "Ação",
    videoUrl: `${BUCKET}/ForBiggerBlazes.mp4`,
    thumbUrl: "/images/posters/chamas-do-destino.jpg",
    year: 2023,
    durationSec: 15,
    rating: "14",
    source: "url",
    views: 19340,
  },
  {
    title: "A Grande Fuga",
    description:
      "Preso numa fortaleza no alto dos cânions, um ladrão de joias lendário tem apenas uma janela de oportunidade: um salto impossível entre dois penhascos. A liberdade nunca esteve tão perto — nem tão longe.",
    category: "Aventura",
    videoUrl: `${BUCKET}/ForBiggerEscapes.mp4`,
    thumbUrl: "/images/posters/a-grande-fuga.jpg",
    year: 2022,
    durationSec: 15,
    rating: "12",
    source: "url",
    views: 15980,
  },
  {
    title: "Noite de Diversão",
    description:
      "É véspera de formatura e quatro amigos têm uma missão: transformar uma noite comum numa lenda que será contada por gerações. Confete, neons e zero plano B — o que pode dar errado?",
    category: "Comédia",
    videoUrl: `${BUCKET}/ForBiggerFun.mp4`,
    thumbUrl: "/images/posters/noite-de-diversao.jpg",
    year: 2023,
    durationSec: 60,
    rating: "L",
    source: "url",
    views: 22740,
  },
  {
    title: "Asfalto Selvagem",
    description:
      "Não é sobre chegar primeiro. É sobre o ronco do motor, o pôr do sol no retrovisor e a estrada que nunca termina. Uma celebração de alta octanagem das clássicas perseguições do cinema.",
    category: "Ação",
    videoUrl: `${BUCKET}/ForBiggerJoyrides.mp4`,
    thumbUrl: "/images/posters/asfalto-selvagem.jpg",
    year: 2021,
    durationSec: 15,
    rating: "12",
    source: "url",
    views: 17520,
  },
  {
    title: "Onda de Calor",
    description:
      "O verão mais quente já registrado transforma uma cidade inteira em panela de pressão. Sorvetes derretem, pavimentos fervem e vizinhos imploram por chuva. Uma crônica tragicômica de um verão apocalíptico.",
    category: "Comédia",
    videoUrl: `${BUCKET}/ForBiggerMeltdowns.mp4`,
    thumbUrl: "/images/posters/onda-de-calor.jpg",
    year: 2022,
    durationSec: 15,
    rating: "10",
    source: "url",
    views: 12130,
  },
  {
    title: "Estradas Selvagens",
    description:
      "De asfalto liso à lama vermelha, um documentário sobre máquinas feitas para o fim do mundo. Uma expedição por ruas, trilhas e estradas de terra onde o destino é apenas uma desculpa para continuar dirigindo.",
    category: "Aventura",
    videoUrl: `${BUCKET}/SubaruOutbackOnStreetAndDirt.mp4`,
    thumbUrl: "/images/posters/estradas-selvagens.jpg",
    year: 2020,
    durationSec: 594,
    rating: "L",
    source: "url",
    views: 9870,
  },
];

async function main() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const db = drizzle(pool);

  const existing = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(videos);
  const count = existing[0]?.count ?? 0;

  if (count > 0) {
    console.log(`Seed ignorado: já existem ${count} vídeos cadastrados.`);
    await pool.end();
    return;
  }

  await db.insert(videos).values(seed);
  console.log(`Seed concluído: ${seed.length} vídeos inseridos.`);
  await pool.end();
}

main().catch((err) => {
  console.error("Falha no seed:", err);
  process.exit(1);
});
