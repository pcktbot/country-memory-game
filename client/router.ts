import { createRouter, createWebHashHistory } from 'vue-router'
import SplashPage from './SplashPage.vue'
import CountriesGame from './CountriesGame.vue'
import UsGame from './UsGame.vue'
import AsiaGame from './AsiaGame.vue'
import CityGame from './CityGame.vue'

export const router = createRouter({
  history: createWebHashHistory(import.meta.env.BASE_URL),
  routes: [
    { path: '/',          component: SplashPage },
    { path: '/countries', component: CountriesGame },
    { path: '/us',        component: UsGame },
    { path: '/asia',      component: AsiaGame },
    { path: '/city',      component: CityGame }
  ]
})
