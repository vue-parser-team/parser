import Vue from 'vue'
import Router from 'vue-router'
import AppParser from '@/components/AppParser'
import AppMarketParser from '@/components/AppMarketParser'

Vue.use(Router)

export default new Router({
  routes: [
    {
      path: '/',
      name: 'Price Parser',
      component: AppParser
    },
    {
      path: '/market',
      name: 'Market Parser',
      component: AppMarketParser
    }
  ]
})
