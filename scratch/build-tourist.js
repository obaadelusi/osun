
const fs = require("fs");
const html = fs.readFileSync("index.html", "utf-8");
const mainStart = html.indexOf("<main");
const mainEnd = html.indexOf("</main>") + "</main>".length;

const top = html.substring(0, mainStart);
const bottom = html.substring(mainEnd);

const touristMain = `
  <main id="main" tabindex="-1">
    <div class="container page-header">
      <h1 class="page-title">Tourist Centres</h1>
      <p class="page-lead">Discover the rich cultural heritage, history, and natural beauty of Osun State.</p>
    </div>

    <section class="container tourist-grid">
      
      <article class="tourist-card">
        <img src="assets/images/osun-sacred-grove.jpg" alt="Osun Sacred Grove" loading="lazy">
        <div class="tourist-card__content">
          <h2>Osun-Osogbo Sacred Grove</h2>
          <p>A UNESCO World Heritage Site located along the banks of the Osun river, housing shrines and sanctuaries dedicated to the fertility goddess.</p>
        </div>
      </article>

      <article class="tourist-card">
        <img src="assets/images/olumirin-waterfall.jpg" alt="Olumirin Waterfall" loading="lazy">
        <div class="tourist-card__content">
          <h2>Olumirin Waterfall</h2>
          <p>Located in Erin-Ijesha, this breathtaking natural wonder features seven distinct cascading levels surrounded by lush mountains.</p>
        </div>
      </article>

      <article class="tourist-card">
        <img src="assets/images/oke-maria.jpg" alt="Oke Maria" loading="lazy">
        <div class="tourist-card__content">
          <h2>Oke Maria</h2>
          <p>A Catholic Marian shrine nestled in Otan Ayegbaju, known for its annual pilgrimage and panoramic views of the surrounding valleys.</p>
        </div>
      </article>

      <article class="tourist-card">
        <img src="assets/images/oduduwa-shrine-groove.jpg" alt="Oduduwa Shrine and Grove" loading="lazy">
        <div class="tourist-card__content">
          <h2>Oduduwa Shrine and Grove</h2>
          <p>Situated in Ile-Ife, the cradle of the Yoruba race. It marks the spot where Oduduwa, the legendary progenitor of the Yoruba people, is revered.</p>
        </div>
      </article>

      <article class="tourist-card">
        <img src="assets/images/moremi-statue.jpg" alt="Moremi Statue of Liberty" loading="lazy">
        <div class="tourist-card__content">
          <h2>Moremi Statue of Liberty</h2>
          <p>Standing tall in Ile-Ife, this monumental statue celebrates the legacy of Moremi Ajasoro, a courageous heroine in Yoruba folklore.</p>
        </div>
      </article>

      <article class="tourist-card">
        <img src="assets/images/civic-centre.jpg" alt="Osogbo Civic Centre" loading="lazy">
        <div class="tourist-card__content">
          <h2>Osogbo Civic Centre</h2>
          <p>A hub of cultural and civic activities, showcasing local arts, history, and the vibrant contemporary life of the state capital.</p>
        </div>
      </article>

    </section>
  </main>
`;

fs.writeFileSync("tourist.html", top + touristMain + bottom);
console.log("Created tourist.html");

