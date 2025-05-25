
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.0/firebase-app.js";
import { 
  getAuth, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut,
  onAuthStateChanged 
} from "https://www.gstatic.com/firebasejs/10.7.0/firebase-auth.js";
import { 
  getFirestore, 
  doc, 
  setDoc, 
  collection, 
  addDoc, 
  getDocs, 
  deleteDoc, 
  query, 
  where 
} from "https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js";
const firebaseConfig = {
  apiKey: "AIzaSyDspr_Tjfid--8lskePSiDtB_9X1Sq2L10",
  authDomain: "pokeinfo-910e5.firebaseapp.com",
  projectId: "pokeinfo-910e5",
  storageBucket: "pokeinfo-910e5.appspot.com",
  messagingSenderId: "100362273506",
  appId: "1:100362273506:web:349f60c6f13bc2a88b54bb"
};
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
window.firebaseApp = app;
window.firebaseAuth = auth;
window.firebaseDb = db;
window.signInWithEmailAndPassword = signInWithEmailAndPassword;
window.createUserWithEmailAndPassword = createUserWithEmailAndPassword;
window.signOut = signOut;
window.onAuthStateChanged = onAuthStateChanged;
window.doc = doc;
window.setDoc = setDoc;
window.collection = collection;
window.addDoc = addDoc;
window.getDocs = getDocs;
window.deleteDoc = deleteDoc;
window.query = query;
window.where = where;
new Vue({
  el: '#app',
  data: {
    pokemon: [],
    filteredPokemon: [],
    searchTerm: '',
    selectedGeneration: 0,
    currentPage: 1,
    itemsPerPage: 20,
    loading: true,
    favorites: [],
    generations: [
      { id: 0, name: 'Tutte', range: [1, 1010] },
      { id: 1, name: 'Gen 1', range: [1, 151] },
      { id: 2, name: 'Gen 2', range: [152, 251] },
      { id: 3, name: 'Gen 3', range: [252, 386] },
      { id: 4, name: 'Gen 4', range: [387, 493] },
      { id: 5, name: 'Gen 5', range: [494, 649] },
      { id: 6, name: 'Gen 6', range: [650, 721] },
      { id: 7, name: 'Gen 7', range: [722, 809] },
      { id: 8, name: 'Gen 8', range: [810, 905] },
      { id: 9, name: 'Gen 9', range: [906, 1010] }
    ],
    selectedPokemon: null,
    showDetails: false,
    pokemonDetails: null,
    loadingDetails: false,
    showFavorites: false,
    loadingFavorites: false,
    isLoggedIn: false,
    showLoginModal: false,
    showRegisterForm: false,
    loginData: {
      email: '',
      password: '',
      rememberMe: false
    },
    registerData: {
      name: '',
      email: '',
      password: '',
      confirmPassword: ''
    },
    loginError: '',
    registerError: '',
    registerSuccess: '',
    currentUser: null,
  },
  computed: {
    totalPages() {
      return Math.ceil(this.filteredPokemon.length / this.itemsPerPage);
    },
    paginatedPokemon() {
      const startIndex = (this.currentPage - 1) * this.itemsPerPage;
      const endIndex = startIndex + this.itemsPerPage;
      return this.filteredPokemon.slice(startIndex, endIndex);
    },
    displayedPages() {
      const pages = [];
      let startPage = Math.max(1, this.currentPage - 2);
      let endPage = Math.min(this.totalPages, this.currentPage + 2);
      if (endPage - startPage < 4) {
        if (startPage === 1) {
          endPage = Math.min(5, this.totalPages);
        } else if (endPage === this.totalPages) {
          startPage = Math.max(1, this.totalPages - 4);
        }
      }
      for (let i = startPage; i <= endPage; i++) {
        pages.push(i);
      }
      return pages;
    },
    statColor() {
      return function(value) {
        if (value < 50) return 'bg-danger';
        if (value < 80) return 'bg-warning';
        if (value < 100) return 'bg-info';
        return 'bg-success';
      };
    },
    favoritePokemon() {
      return this.pokemon.filter(pokemon => this.favorites.includes(pokemon.id));
    },
    userId() {
      return this.currentUser ? this.currentUser.id : null;
    }
  },
  methods: {
    async fetchPokemon() {
      this.loading = true;
      try {
        const response = await axios.get('https://pokeapi.co/api/v2/pokemon?limit=1010');
        const results = response.data.results;
        this.pokemon = await Promise.all(results.map(async (pokemon, index) => {
          const detailResponse = await axios.get(pokemon.url);
          const data = detailResponse.data;
          return {
            id: data.id,
            name: data.name.charAt(0).toUpperCase() + data.name.slice(1),
            imageUrl: data.sprites.other['official-artwork'].front_default || data.sprites.front_default,
            types: data.types.map(type => ({
              name: type.type.name,
              class: `type-${type.type.name}`
            })),
            stats: data.stats.reduce((acc, stat) => {
              acc[stat.stat.name] = stat.base_stat;
              return acc;
            }, {}),
            abilities: data.abilities.map(ability => 
              ability.ability.name.charAt(0).toUpperCase() + ability.ability.name.slice(1).replace('-', ' ')
            ),
            height: data.height / 10, // Conversione da decimetri a metri
            weight: data.weight / 10, // Conversione da etti a kg
            apiUrl: pokemon.url
          };
        }));
        await this.loadFavoritesFromDatabase();
        this.filterByGeneration();
      } catch (error) {
        console.error('Errore nel caricamento dei Pokémon:', error);
      } finally {
        this.loading = false;
      }
    },
    filterByGeneration() {
      const generation = this.generations.find(gen => gen.id === this.selectedGeneration);
      if (generation.id === 0) {
        this.filteredPokemon = [...this.pokemon];
      } else {
        this.filteredPokemon = this.pokemon.filter(pokemon => 
          pokemon.id >= generation.range[0] && pokemon.id <= generation.range[1]
        );
      }
      if (this.searchTerm.trim() !== '') {
        this.filteredPokemon = this.filteredPokemon.filter(pokemon => 
          pokemon.name.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
          pokemon.id.toString() === this.searchTerm
        );
      }
      this.currentPage = 1;
    },
    selectGeneration(genId) {
      this.selectedGeneration = genId;
      this.filterByGeneration();
    },
    handleSearch() {
      this.filterByGeneration();
    },
    goToPage(page) {
      if (page < 1 || page > this.totalPages) return;
      this.currentPage = page;
      this.$nextTick(() => {
        document.getElementById('pokemon-list').scrollIntoView({ behavior: 'smooth' });
      });
    },
    async toggleFavorite(pokemonId) {
      const index = this.favorites.indexOf(pokemonId);
      if (index === -1) {
        this.favorites.push(pokemonId);
        await this.saveFavoriteToDatabase(pokemonId);
      } else {
        this.favorites.splice(index, 1);
        await this.removeFavoriteFromDatabase(pokemonId);
      }
    },
    isFavorite(pokemonId) {
      return this.favorites.includes(pokemonId);
    },
    
    async loadFavoritesFromDatabase() {
      this.loadingFavorites = true;
      try {
        const response = await fetch(`/api/favorites?userId=${this.userId}`);
        if (response.ok) {
          const data = await response.json();
          this.favorites = data.favorites.map(fav => fav.pokemon_id);
        }
      } catch (error) {
        console.error('Errore nel caricamento dei preferiti dal database:', error);
        this.loadFavorites();
      } finally {
        this.loadingFavorites = false;
      }
    },
    async saveFavoriteToDatabase(pokemonId) {
      try {
        await fetch('/api/favorites', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            userId: this.userId,
            pokemonId: pokemonId
          })
        });
      } catch (error) {
        console.error('Errore nel salvataggio del preferito:', error);
        localStorage.setItem('pokemonFavorites', JSON.stringify(this.favorites));
      }
    },
    async removeFavoriteFromDatabase(pokemonId) {
      try {
        await fetch(`/api/favorites/${this.userId}/${pokemonId}`, {
          method: 'DELETE'
        });
      } catch (error) {
        console.error('Errore nella rimozione del preferito:', error);
        localStorage.setItem('pokemonFavorites', JSON.stringify(this.favorites));
      }
    },
    showPokemonDetails(pokemon) {
      this.selectedPokemon = pokemon;
      this.loadPokemonDetails(pokemon);
      this.showDetails = true;
    },
    closeDetails() {
      this.showDetails = false;
      this.selectedPokemon = null;
      this.pokemonDetails = null;
    },
    showFavoritesPage() {
      this.showFavorites = true;
      this.filteredPokemon = this.favoritePokemon;
      this.currentPage = 1;
    },
    showHomePage() {
      this.showFavorites = false;
      this.filterByGeneration();
    },
    async loadPokemonDetails(pokemon) {
      if (!pokemon) return;
      this.loadingDetails = true;
      try {
        const response = await axios.get(pokemon.apiUrl);
        const data = response.data;
        const speciesResponse = await axios.get(data.species.url);
        let description = '';
        const flavorTexts = speciesResponse.data.flavor_text_entries;
        const italianText = flavorTexts.find(entry => entry.language.name === 'it');
        if (italianText) {
          description = italianText.flavor_text;
        } else {
          const englishText = flavorTexts.find(entry => entry.language.name === 'en');
          if (englishText) {
            description = englishText.flavor_text;
          }
        }
        description = description.replace(/[\n\f]/g, ' ');
        this.pokemonDetails = {
          id: data.id,
          name: pokemon.name,
          imageUrl: pokemon.imageUrl,
          types: pokemon.types,
          description: description,
          height: pokemon.height,
          weight: pokemon.weight,
          abilities: pokemon.abilities,
          stats: [
            { name: 'HP', value: data.stats.find(s => s.stat.name === 'hp').base_stat },
            { name: 'Attacco', value: data.stats.find(s => s.stat.name === 'attack').base_stat },
            { name: 'Difesa', value: data.stats.find(s => s.stat.name === 'defense').base_stat },
            { name: 'Att. Speciale', value: data.stats.find(s => s.stat.name === 'special-attack').base_stat },
            { name: 'Dif. Speciale', value: data.stats.find(s => s.stat.name === 'special-defense').base_stat },
            { name: 'Velocità', value: data.stats.find(s => s.stat.name === 'speed').base_stat }
          ],
          baseExperience: data.base_experience
        };
      } catch (error) {
        console.error('Errore nel caricamento dei dettagli del Pokémon:', error);
      } finally {
        this.loadingDetails = false;
      }
    },
    calculateStatPercentage(value) {
      return Math.min(100, Math.round((value / 255) * 100));
    },
    showLogin() {
      this.loginError = '';
      this.showLoginModal = true;
      this.showRegisterForm = false;
    },
    showRegister() {
      this.registerError = '';
      this.registerSuccess = '';
      this.showRegisterForm = true;
    },
    closeLoginModal() {
      this.showLoginModal = false;
      this.loginError = '';
      this.registerError = '';
      this.registerSuccess = '';
    },
    async login() {
      this.loginError = '';
      if (!this.loginData.email || !this.loginData.password) {
        this.loginError = 'Per favore, inserisci email e password';
        return;
      }
      try {
        const userCredential = await signInWithEmailAndPassword(
          firebaseAuth, 
          this.loginData.email, 
          this.loginData.password
        );
        this.isLoggedIn = true;
        this.currentUser = {
          id: userCredential.user.uid,
          name: this.loginData.email.split('@')[0],
          email: this.loginData.email
        };
        if (this.loginData.rememberMe) {
          localStorage.setItem('pokedexUser', JSON.stringify(this.currentUser));
        }
        await this.loadFavoritesFromDatabase();
        this.closeLoginModal();
      } catch (error) {
        console.error('Errore durante il login:', error);
        if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password') {
          this.loginError = 'Email o password non validi';
        } else {
          this.loginError = 'Errore durante il login. Riprova più tardi.';
        }
      }
    },
    async register() {
      this.registerError = '';
      this.registerSuccess = '';
      if (!this.registerData.name || !this.registerData.email || !this.registerData.password) {
        this.registerError = 'Tutti i campi sono obbligatori';
        return;
      }
      if (this.registerData.password !== this.registerData.confirmPassword) {
        this.registerError = 'Le password non corrispondono';
        return;
      }
      try {
        const userCredential = await createUserWithEmailAndPassword(
          firebaseAuth, 
          this.registerData.email, 
          this.registerData.password
        );
        await setDoc(doc(db, "users", userCredential.user.uid), {
          name: this.registerData.name,
          email: this.registerData.email,
          createdAt: new Date().toISOString()
        });
        this.registerSuccess = 'Registrazione avvenuta con successo! Ora puoi accedere con le tue credenziali.';
        this.registerData = {
          name: '',
          email: '',
          password: '',
          confirmPassword: ''
        };
        setTimeout(() => {
          this.showRegisterForm = false;
        }, 2000);
      } catch (error) {
        console.error('Errore durante la registrazione:', error);
        if (error.code === 'auth/email-already-in-use') {
          this.registerError = 'Questa email è già in uso';
        } else if (error.code === 'auth/weak-password') {
          this.registerError = 'La password è troppo debole';
        } else {
          this.registerError = 'Errore durante la registrazione. Riprova più tardi.';
        }
      }
    },
    async logout() {
      try {
        await signOut(firebaseAuth);
        this.isLoggedIn = false;
        this.currentUser = null;
        this.favorites = [];
        localStorage.removeItem('pokedexUser');
        this.showHomePage();
      } catch (error) {
        console.error('Errore durante il logout:', error);
      }
    },
    async loadFavoritesFromDatabase() {
      if (!this.userId) {
        this.favorites = [];
        return;
      }
      this.loadingFavorites = true;
      try {
        const favoritesRef = collection(db, "favorites");
        const q = query(favoritesRef, where("userId", "==", this.userId));
        const querySnapshot = await getDocs(q);
        this.favorites = [];
        querySnapshot.forEach((doc) => {
          this.favorites.push(doc.data().pokemonId);
        });
      } catch (error) {
        console.error('Errore nel caricamento dei preferiti:', error);
        this.favorites = [];
      } finally {
        this.loadingFavorites = false;
      }
    },
    async saveFavoriteToDatabase(pokemonId) {
      if (!this.isLoggedIn) {
        this.showLogin();
        return;
      }
      try {
        await addDoc(collection(db, "favorites"), {
          userId: this.userId,
          pokemonId: pokemonId,
          addedAt: new Date().toISOString()
        });
      } catch (error) {
        console.error('Errore nel salvataggio del preferito:', error);
        const index = this.favorites.indexOf(pokemonId);
        if (index !== -1) {
          this.favorites.splice(index, 1);
        }
      }
    },
    async removeFavoriteFromDatabase(pokemonId) {
      try {
        const favoritesRef = collection(db, "favorites");
        const q = query(
          favoritesRef, 
          where("userId", "==", this.userId),
          where("pokemonId", "==", pokemonId)
        );
        const querySnapshot = await getDocs(q);
        querySnapshot.forEach(async (document) => {
          await deleteDoc(doc(db, "favorites", document.id));
        });
      } catch (error) {
        console.error('Errore nella rimozione del preferito:', error);
        if (!this.favorites.includes(pokemonId)) {
          this.favorites.push(pokemonId);
        }
      }
    },
    async toggleFavorite(pokemonId) {
      if (!this.isLoggedIn) {
        this.showLogin();
        return;
      }
      const index = this.favorites.indexOf(pokemonId);
      if (index === -1) {
        this.favorites.push(pokemonId);
        await this.saveFavoriteToDatabase(pokemonId);
      } else {
        this.favorites.splice(index, 1);
        await this.removeFavoriteFromDatabase(pokemonId);
      }
    },
}, 
  template: `
    <div>
      <!-- Navbar -->
      <!-- Navbar corretta -->
      <nav class="navbar navbar-expand-lg sticky-top mb-4">
        <div class="container">
          <a class="navbar-brand" href="#">
            <img src="https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/poke-ball.png" alt="PokéBall" width="30" height="30" class="d-inline-block align-text-top me-2">
            Exploremon
          </a>
          <button class="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#navbarNav" aria-controls="navbarNav" aria-expanded="false" aria-label="Toggle navigation">
            <span class="navbar-toggler-icon"></span>
          </button>
          <div class="collapse navbar-collapse" id="navbarNav">
            <ul class="navbar-nav ms-auto">
              <li class="nav-item">
                <a class="nav-link" :class="{ active: !showFavorites }" href="#" @click.prevent="showHomePage">Home</a>
              </li>
              <li class="nav-item">
                <a class="nav-link" :class="{ active: showFavorites }" href="#" @click.prevent="showFavoritesPage">
                  Preferiti
                  <span v-if="favorites.length > 0" class="badge bg-light text-dark ms-1">{{ favorites.length }}</span>
                </a>
              </li>
              <li class="nav-item" v-if="!isLoggedIn">
                <a class="nav-link login-link" href="#" @click.prevent="showLogin">
                  <i class="fas fa-sign-in-alt me-1"></i> Accedi
                </a>
              </li>
              <li class="nav-item dropdown" v-else>
                <a class="nav-link dropdown-toggle user-dropdown" href="#" id="userDropdown" role="button" data-bs-toggle="dropdown" aria-expanded="false">
                  <i class="fas fa-user-circle me-1"></i> {{ currentUser.name }}
                </a>
                <ul class="dropdown-menu dropdown-menu-end" aria-labelledby="userDropdown">
                  <li><a class="dropdown-item" href="#" @click.prevent="showFavoritesPage">I miei preferiti</a></li>
                  <li><hr class="dropdown-divider"></li>
                  <li><a class="dropdown-item" href="#" @click.prevent="logout">Esci</a></li>
                </ul>
              </li>
            </ul>
          </div>
        </div>
      </nav>
      <!-- Contenuto principale -->
      <div class="container">
        <!-- Barra di ricerca -->
        <div class="search-container">
          <div class="row">
            <div class="col-md-8 mx-auto">
              <div class="input-group mb-3">
                <input 
                  type="text" 
                  class="form-control" 
                  placeholder="Cerca Pokémon per nome o numero..." 
                  v-model="searchTerm" 
                  @input="handleSearch"
                  :disabled="showFavorites && filteredPokemon.length === 0"
                >
                <button class="btn btn-primary" type="button" @click="handleSearch" :disabled="showFavorites && filteredPokemon.length === 0">
                  <i class="fas fa-search"></i> Cerca
                </button>
              </div>
            </div>
          </div>
          <!-- Filtri generazione (visibili solo nella home) -->
          <div v-if="!showFavorites" class="text-center mt-3">
            <span 
              v-for="gen in generations" 
              :key="gen.id"
              class="badge rounded-pill gen-chip"
              :class="[selectedGeneration === gen.id ? 'active' : 'bg-white']"
              @click="selectGeneration(gen.id)"
            >
              {{ gen.name }}
            </span>
          </div>
        </div>
        <!-- Messaggio di caricamento dei preferiti -->
        <div v-if="loadingFavorites" class="alert alert-info text-center">
          Caricamento dei preferiti in corso...
        </div>
        <!-- Loading spinner -->
        <div v-if="loading" class="spinner-container">
          <div class="spinner-border text-primary" role="status">
            <span class="visually-hidden">Loading...</span>
          </div>
        </div>
        <!-- Lista Pokémon -->
        <div v-else id="pokemon-list">
          <div v-if="filteredPokemon.length === 0" class="alert alert-info text-center">
            <span v-if="showFavorites">Non hai ancora aggiunto Pokémon ai preferiti.</span>
            <span v-else>Nessun Pokémon trovato con questi criteri di ricerca.</span>
          </div>
          <div class="row">
            <div class="col-12 mb-3">
              <h2 class="mb-0" v-if="!showFavorites">
                {{ selectedGeneration === 0 ? 'Tutti i Pokémon' : generations.find(g => g.id === selectedGeneration).name }}
                <small class="text-muted">{{ filteredPokemon.length }} Pokémon</small>
              </h2>
              <h2 class="mb-0" v-else>
                I Tuoi Pokémon Preferiti
                <small class="text-muted">{{ filteredPokemon.length }} Pokémon</small>
              </h2>
            </div>
            <div v-for="pokemon in paginatedPokemon" :key="pokemon.id" class="col-md-6 col-lg-3">
              <div class="card pokemon-card">
                <div class="pokemon-img-container">
                  <img :src="pokemon.imageUrl" class="card-img-top" alt="pokemon.name" style="height: 150px; object-fit: contain;">
                  <button 
                    class="favorite-btn" 
                    :class="{ active: isFavorite(pokemon.id) }"
                    @click="toggleFavorite(pokemon.id)"
                  >
                    <i class="fas fa-heart"></i>
                  </button>
                </div>
                <div class="card-body">
                  <h5 class="card-title">{{ pokemon.name }}</h5>
                  <p class="pokemon-number">#{{ pokemon.id.toString().padStart(3, '0') }}</p>
                  <div class="mb-2">
                    <span 
                      v-for="type in pokemon.types" 
                      :key="type.name" 
                      class="pokemon-type" 
                      :class="type.class"
                    >
                      {{ type.name }}
                    </span>
                  </div>
                  <div class="d-grid">
                    <button class="btn btn-sm btn-outline-primary" @click="showPokemonDetails(pokemon)">Vedi dettagli</button>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <!-- Paginazione -->
          <nav v-if="totalPages > 1" aria-label="Pagine Pokémon">
            <ul class="pagination">
              <li class="page-item" :class="{ disabled: currentPage === 1 }">
                <a class="page-link" href="#" @click.prevent="goToPage(1)">
                  <i class="fas fa-angle-double-left"></i>
                </a>
              </li>
              <li class="page-item" :class="{ disabled: currentPage === 1 }">
                <a class="page-link" href="#" @click.prevent="goToPage(currentPage - 1)">
                  <i class="fas fa-angle-left"></i>
                </a>
              </li>
              <li v-if="displayedPages[0] > 1" class="page-item">
                <a class="page-link" href="#" @click.prevent="goToPage(1)">1</a>
              </li>
              <li v-if="displayedPages[0] > 2" class="page-item disabled">
                <span class="page-link">...</span>
              </li>
              <li 
                v-for="page in displayedPages"
                :key="page"
                class="page-item"
                :class="{ active: currentPage === page }"
              >
                <a class="page-link" href="#" @click.prevent="goToPage(page)">{{ page }}</a>
              </li>
              <li v-if="displayedPages[displayedPages.length - 1] < totalPages - 1" class="page-item disabled">
                <span class="page-link">...</span>
              </li>
              <li v-if="displayedPages[displayedPages.length - 1] < totalPages" class="page-item">
                <a class="page-link" href="#" @click.prevent="goToPage(totalPages)">{{ totalPages }}</a>
              </li>
              <li class="page-item" :class="{ disabled: currentPage === totalPages }">
                <a class="page-link" href="#" @click.prevent="goToPage(currentPage + 1)">
                  <i class="fas fa-angle-right"></i>
                </a>
              </li>
              <li class="page-item" :class="{ disabled: currentPage === totalPages }">
                <a class="page-link" href="#" @click.prevent="goToPage(totalPages)">
                  <i class="fas fa-angle-double-right"></i>
                </a>
              </li>
            </ul>
          </nav>
        </div>
        <div class="modal fade" :class="{ show: showLoginModal }" :style="{ display: showLoginModal ? 'block' : 'none' }" tabindex="-1" aria-labelledby="loginModalLabel" aria-hidden="true">
<div class="modal-dialog">
  <div class="modal-content">
    <div class="modal-header" style="background-color: #e63946; color: white;">
      <h5 class="modal-title" id="loginModalLabel">
        {{ showRegisterForm ? 'Registrati' : 'Accedi' }}
      </h5>
      <button type="button" class="btn-close" style="filter: invert(1) grayscale(100%) brightness(200%);" @click="closeLoginModal" aria-label="Close"></button>
    </div>
    <div class="modal-body">
      <!-- Form Login -->
      <form v-if="!showRegisterForm" @submit.prevent="login">
        <div v-if="loginError" class="alert alert-danger">{{ loginError }}</div>
        <div class="mb-3">
          <label for="loginEmail" class="form-label">Email</label>
          <input type="email" class="form-control" id="loginEmail" v-model="loginData.email" required>
        </div>
        <div class="mb-3">
          <label for="loginPassword" class="form-label">Password</label>
          <input type="password" class="form-control" id="loginPassword" v-model="loginData.password" required>
        </div>
        <div class="mb-3 form-check">
          <input type="checkbox" class="form-check-input" id="rememberMe" v-model="loginData.rememberMe">
          <label class="form-check-label" for="rememberMe">Ricordami</label>
        </div>
        <div class="d-grid gap-2">
          <button type="submit" class="btn btn-primary">Accedi</button>
          <button type="button" class="btn btn-outline-secondary" @click="showRegister">Non hai un account? Registrati</button>
        </div>
      </form>
      <!-- Form Registrazione -->
      <form v-else @submit.prevent="register">
        <div v-if="registerError" class="alert alert-danger">{{ registerError }}</div>
        <div v-if="registerSuccess" class="alert alert-success">{{ registerSuccess }}</div>
        <div class="mb-3">
          <label for="registerName" class="form-label">Nome</label>
          <input type="text" class="form-control" id="registerName" v-model="registerData.name" required>
        </div>
        <div class="mb-3">
          <label for="registerEmail" class="form-label">Email</label>
          <input type="email" class="form-control" id="registerEmail" v-model="registerData.email" required>
        </div>
        <div class="mb-3">
          <label for="registerPassword" class="form-label">Password</label>
          <input type="password" class="form-control" id="registerPassword" v-model="registerData.password" required>
        </div>
        <div class="mb-3">
          <label for="confirmPassword" class="form-label">Conferma Password</label>
          <input type="password" class="form-control" id="confirmPassword" v-model="registerData.confirmPassword" required>
        </div>
        <div class="d-grid gap-2">
          <button type="submit" class="btn btn-primary">Registrati</button>
          <button type="button" class="btn btn-outline-secondary" @click="showRegisterForm = false">Hai già un account? Accedi</button>
        </div>
      </form>
    </div>
  </div>
</div>
</div>
<!-- Backdrop per il modal -->
<div v-if="showLoginModal" class="modal-backdrop fade show"></div>
      </div>
      <!-- Modal per i dettagli del Pokémon -->
      <div class="modal fade" :class="{ show: showDetails }" :style="{ display: showDetails ? 'block' : 'none' }" tabindex="-1" role="dialog" aria-labelledby="pokemonDetailsModal">
        <div class="modal-dialog modal-lg" role="document">
          <div class="modal-content">
            <!-- Loading spinner per i dettagli -->
            <div v-if="loadingDetails" class="spinner-container p-5">
              <div class="spinner-border text-primary" role="status">
                <span class="visually-hidden">Loading...</span>
              </div>
            </div>
            <!-- Contenuto dei dettagli -->
            <div v-else-if="pokemonDetails">
              <div class="modal-header">
                <h5 class="modal-title" id="pokemonDetailsTitle">
                  {{ pokemonDetails.name }}
                  <span class="text-muted ms-2">#{{ pokemonDetails.id.toString().padStart(3, '0') }}</span>
                </h5>
                <button type="button" class="btn-close" @click="closeDetails" aria-label="Close"></button>
              </div>
              <div class="modal-body">
                <div class="row">
                  <!-- Immagine e info base -->
                  <div class="col-md-5 text-center">
                    <img :src="pokemonDetails.imageUrl" class="img-fluid mb-3" alt="pokemonDetails.name" style="max-height: 200px;">
                    <div class="mb-3">
                      <span 
                        v-for="type in pokemonDetails.types" 
                        :key="type.name" 
                        class="pokemon-type" 
                        :class="type.class"
                      >
                        {{ type.name }}
                      </span>
                    </div>
                    <div class="card mb-3">
                      <div class="card-body">
                        <div class="row">
                          <div class="col-6">
                            <p class="mb-1"><strong>Altezza</strong></p>
                            <p>{{ pokemonDetails.height }} m</p>
                          </div>
                          <div class="col-6">
                            <p class="mb-1"><strong>Peso</strong></p>
                            <p>{{ pokemonDetails.weight }} kg</p>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div class="card">
                      <div class="card-header">
                        <h6 class="mb-0">Abilità</h6>
                      </div>
                      <div class="card-body">
                        <p class="mb-0">{{ pokemonDetails.abilities.join(', ') }}</p>
                      </div>
                    </div>
                  </div>
                  <!-- Descrizione e statistiche -->
                  <div class="col-md-7">
                    <div class="card mb-3">
                      <div class="card-header">
                        <h6 class="mb-0">Descrizione</h6>
                      </div>
                      <div class="card-body">
                        <p>{{ pokemonDetails.description || 'Nessuna descrizione disponibile.' }}</p>
                      </div>
                    </div>
                    <div class="card">
                      <div class="card-header">
                        <h6 class="mb-0">Statistiche base</h6>
                      </div>
                      <div class="card-body">
                        <div v-for="stat in pokemonDetails.stats" :key="stat.name" class="mb-2">
                          <div class="d-flex justify-content-between align-items-center mb-1">
                            <span class="stat-name">{{ stat.name }}</span>
                            <span class="stat-value">{{ stat.value }}</span>
                          </div>
                          <div class="progress" style="height: 10px;">
                            <div 
                              class="progress-bar" 
                              :class="statColor(stat.value)"
                              role="progressbar" 
                              :style="{ width: calculateStatPercentage(stat.value) + '%' }" 
                              :aria-valuenow="stat.value" 
                              aria-valuemin="0" 
                              aria-valuemax="255">
                            </div>
                          </div>
                        </div>
                        <p class="mt-3 mb-0">
                          <small class="text-muted">Esperienza Base: {{ pokemonDetails.baseExperience || 'N/A' }}</small>
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <div class="modal-footer">
                <button type="button" class="btn btn-secondary" @click="closeDetails">Chiudi</button>
                <button 
                  type="button" 
                  class="btn" 
                  :class="isFavorite(pokemonDetails.id) ? 'btn-danger' : 'btn-outline-danger'"
                  @click="toggleFavorite(pokemonDetails.id)"
                >
                  <i class="fas fa-heart me-1"></i>
                  {{ isFavorite(pokemonDetails.id) ? 'Rimuovi dai preferiti' : 'Aggiungi ai preferiti' }}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
      <!-- Backdrop per la modal -->
      <div v-if="showDetails" class="modal-backdrop fade show"></div>
      <!-- Footer -->
      <footer class="py-3 mt-5 bg-light">
        <div class="container text-center">
          <p class="mb-0">PokéDex - Progetto d'esame universitario</p>
        </div>
      </footer>
    </div>
  `,
  mounted() {
    this.fetchPokemon();
    this.checkLoggedInUser();
  }
});
  
