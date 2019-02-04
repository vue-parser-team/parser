<template>
  <div id="app">
    <app-info></app-info>
    <router-view/>
  </div>
</template>

<script>
import AppInfo from './components/AppInfo.vue'
import AppParser from './components/AppParser.vue'

export default {
  name: 'App',
  data () {
    return {
    }
  },

  components: {
    AppInfo,
    AppParser
  },

  created () {
  },

  methods: {
  }
}
</script>

<style>
    #app {
      background-image: url(assets/bg2.png);
      min-height: 100vh;
      overflow: hidden;
      height: 100%;
      width: 100%;
      margin: 0px;
      padding: 0px;
      display: flex;
      justify-content: space-around;
      flex-wrap: wrap;
    }
</style>
