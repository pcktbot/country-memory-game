import { createRouter, createWebHashHistory } from 'vue-router'
import App from './App.vue'
import CityGame from './CityGame.vue'

export const router = createRouter({
  history: createWebHashHistory(import.meta.env.BASE_URL),
  routes: [
    { path: '/', component: App },
    { path: '/city', component: CityGame }
  ]
})
