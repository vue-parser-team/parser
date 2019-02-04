<template>
    <div class="parser_wrp">
    <div class="requester">
      <label for="fls" class="custom-file-upload" ref="hideUpload">
         Загрузить файл
      </label>
      <input type="file" @change="parseLocal" id="fls">
    </div>
        <div class="table" v-if="tableParsed.length > 0">
             <div class="download" title="Сохранить в Excel" @click="checkDownload()">
               <json-excel v-if="primaryDownload" id="dwnld"
                :data="tableParsed"
                :name="filename">d</json-excel>
             </div>
             <div :class="['redact', {'redact_on': redact}]"
              :title="redact ? 'Отключить редактирование таблицы' : 'Редактировать таблицу'"
              @click="redact = !redact">
             </div>
         <div class="error" v-if="askUser">
           <h5>Процесс парсинга еще не окончен.</h5>
           <h5>Сохранить текущий результат?</h5>
           <div class="btn_wrp">
             <button @click="answerUser(true)" class="save">Сохранить</button>
             <button @click="answerUser(false)" class="close">Закрыть</button>
           </div>
         </div>
          <div class="theader">
              <div class="header_item"
              v-for="(col, i) in cols"
              :key="col.name"
              @click.self="hideNameCol(col)"
              :title="col.__width <= 40 ? 'Развернуть' : 'Свернуть'"
              :style="{width: col.__width + 'px'}">
              {{col.name}}
              <span class="resize" @mousedown.self="resizePrepare($event.target.offsetParent, i)">.<br>.<br>.</span>
              </div>
          </div>
          <div class="tbody">
            <div v-for="(row, index) in tableParsed" :key="index"
             @dblclick="row.__checked = !row.__checked"
             :class="['row', {'checked': row.__checked}]"
             >
              <div :class="['col', {'editable': redact && row.__checked}]"
                v-for="col in cols"
                :key="row[col.name] + col.name + index"
                :style="{width: col.__width + 'px'}"
                :title="showTitleRedirect(tableDataParsing[index][col.name], col.name)"
                @click.ctrl="goToUrl(tableDataParsing[index][col.name], col.name)">
                <input :readonly="!redact" v-model.lazy="row[col.name]">
              </div>
            </div>
          </div>
        </div>
        <div class="loading_status" v-if="false">
          <p>{{ loading }}</p>
        </div>
    </div>
</template>

<script>
import axios from 'axios'
import _ from 'lodash'
import Papa from 'papaparse'
import JsonExcel from 'vue-json-excel'

export default {
  name: 'app-parser',
  data () {
    return {
      status: 'Development in the process...',
      redact: false,
      colResize: '',
      elResize: '',
      siteData: '',
      cols: [],
      tableDataParsing: [],
      tableParsed: [],
      sort: false,
      askUser: false,
      startDatafileLength: 0,
      primaryDownload: false
    }
  },

  components: {
    JsonExcel
  },

  methods: {
    // сворачиваем первый столбец
    hideNameCol (col) {
      if (col.__width > 100) {
        let interv = setInterval(() => {
          if (col.__width >= 40) {
            col.__width -= 10
          } else {
            clearInterval(interv)
          }
        }, 2)
      } else {
        let interv = setInterval(() => {
          if (col.__width <= 300) {
            col.__width += 10
          } else {
            clearInterval(interv)
          }
        }, 2)
      }
    },
    // Изменение размеров колонок
    resizePrepare (el, indCol) {
      this.colResize = indCol
      this.elResize = el
      document.addEventListener('mousemove', this.resizeAction)
      document.addEventListener('mouseup', this.stopResize)
    },
    resizeAction (e) {
      let w = parseInt(this.cols[this.colResize].__width)
      this.cols[this.colResize].__width = w + e.movementX
    },
    stopResize () {
      document.removeEventListener('mousemove', this.resizeAction)
      document.removeEventListener('mouseup', this.stopResize)
    },

    // Отображение тайтла о переходе
    showTitleRedirect (url, colName) {
      if (url && url.length > 5 && colName !== 'Name' && !this.redact) {
        return 'Нажмите Ctrl + ЛКМ для перехода на страницу товара'
      }
      return ''
    },
    // Переход по ссылке на сайт оригинала
    goToUrl (url, colName) {
      if (url && url.length > 5 && colName !== 'Name' && !this.redact) {
        window.open(url, '_blank')
      }
    },

    download () {
      this.tableParsed.forEach(ti => {
        delete ti.__checked
      })
      this.primaryDownload = true
      setTimeout(() => {
        document.getElementById('dwnld').click()
        this.primaryDownload = false
        this.askUser = false
      }, 500)
      setTimeout(() => {
        this.tableParsed.forEach(ti => {
          ti['__checked'] = false
        })
      }, 1500)
    },
    answerUser (status) {
      this.primaryDownload = status
      this.askUser = false
      if (status) {
        this.download()
      }
    },
    // Проверка загрузки
    checkDownload () {
      if (this.startDatafileLength === this.datalength) {
        this.download()
      } else {
        this.askUser = true
      }
    },
    // Цикличный парсинг цен
    prepareTable (dataFile) {
      if (dataFile[0] && dataFile[1]) {
        this.startDatafileLength = dataFile.length - 2
        dataFile[0].forEach((d0, index) => {
          let mask = dataFile[1][index]
          if (mask && mask.startsWith('{')) {
            try {
              mask = JSON.parse(mask)
            } catch (e) {
              console.error('Не удалось распарсить маску поиска. Проверьте корректрость JSON. ', e)
            }
          }
          this.cols.push({name: d0, mask: mask || '', link: '', price: '', __width: '300'})
        })
        console.log('result cols => ', this.cols)
      }
      if (dataFile[3]) {
        this.tableDataParsing = []
        for (let i = 2; i < dataFile.length - 1; i++) {
          let row = {}
          this.cols.forEach((cc, index) => {
            row[cc.name] = dataFile[i][index]
          })
          row['__checked'] = false
          this.tableDataParsing.push(row)
        }
      }
      this.getPrices()
    },

    // Парсим локальный файл
    parseLocal (e) {
      this.$refs.hideUpload.style.height = '0px'
      this.$refs.hideUpload.style.padding = '0px'
      if (e.target.files[0]) {
        let file = e.target.files[0]
        Papa.parse(file, {
          complete: results => {
            if (results && results.data) {
              this.prepareTable(results.data)
            }
          }
        })
      }
    },

    getPrices () {
      this.tableParsed = _.cloneDeep(this.tableDataParsing)
      this.tableParsed.forEach((row, rowIndex) => {
        this.cols.forEach((col, index) => {
          if (index !== 0) {
            if (row[col.name]) {
              let url = row[col.name]
              this.getUrl(url, col.mask)
                .then(res => {
                  this.tableParsed[rowIndex][col.name] = res
                })
            } else {
              this.tableParsed[rowIndex][col.name] = 'none'
            }
          }
        })
      })
    },

    getUrl (url, mask) {
      return axios.get('js/request.php?url=' + url)
        .then(resp => {
          let parser = new DOMParser()
          let htmlDoc = parser.parseFromString(resp.data, 'text/html')
          return this.getPriceValue(htmlDoc, mask)
        })
    },
    // Вытаскиваем значение со страницы
    getPriceValue (doc, mask) {
      let res = ''
      if (mask && mask.parent && mask.child) {
        let mp = mask.parent
        let mc = mask.child
        res = doc.getElementsByClassName(mp)[0]
        if (res && res.children[0] && res.children[0].className.indexOf(mc) !== -1) {
          res = res.children[0]
        } else if (res && res.children[0] && res.children[0].children[0] && res.children[0].children[0].className.indexOf(mc) !== -1) {
          res = res.children[0].children[0]
        } else if (res && res.children[0] && res.children[0].children[0] && res.children[0].children[0].children[0] && res.children[0].children[0].children[0].className.indexOf(mc) !== -1) {
          res = res.children[0].children[0].children[0]
        } else {
          return 'none'
        }
      } else if (mask.mainClass && mask.alternativeClass) {
        let mc = mask.mainClass
        let ac = mask.alternativeClass
        res = doc.getElementsByClassName(mc)[0]
        if (!res) {
          res = doc.getElementsByClassName(ac)[0]
        }
      } else if (mask) {
        res = doc.getElementsByClassName(mask)[0]
      }
      let price = ''
      if (res) {
        price = res.innerText
        price = price.replace(/[^-0-9]/gi, '')
        if (price.length < 1) {
          return 'none'
        } else {
          return price + ' руб.'
        }
      }
      return price
    }
  },

  computed: {
    filename () {
      let res = 'parcer_result_' + new Date().toISOString()
        .substr(0, 10)
      return res + '.xls'
    },
    datalength () {
      return this.tableParsed.length
    },
    loading () {
      let res = Math.ceil(this.datalength / this.startDatafileLength * 100) + ' %'
      return res
    }
  }
}
</script>
<style>
  .parser_wrp {
    width: 100%;
    display: flex;
    flex-direction: column;
    align-items: center;
  }
  .requester {
    display: flex;
    flex-direction: column;
    align-items: center;
    transition: all .3s
  }
  .table {
    max-width: 93%;
    position: relative;
    border: 1px solid #41b883;
    border-radius: 15px 0px 15px 0px;
    max-height: 95vh;
    background-color: #fdfffa;
    overflow: scroll;
    box-shadow: 0px 0px 11px 3px #35495eb3;
  }
  .row {
    display: inline-flex;
    justify-content: flex-start;
    align-content: center;
    height: 50px;
    min-width: 100%;
    max-height: 50px;
    border-bottom: 1px solid #a3a3a321;
    transition: all .2s;
  }
  .checked {
    background-color: #41b8832e;
  }
  .tbody .row:hover {
    background-color: #41b8832e;
    border-radius: 0px 20px 20px 0px;
  }
  .theader {
    display: inline-flex;
    flex-direction: row;
    justify-content: flex-start;
    position: sticky;
    top: 0;
    left: 0;
    overflow: hidden;
    background-color: #41b883;
    min-width: 100%;
    min-height: 50px;
    z-index: 80;
  }
  .header_item {
    color: #fff;
    min-height: 50px;
    max-height: 50px;
    padding: 5px 20px;
    font-size: 30px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    position: relative;
    transition: all .2s;
    overflow: hidden;
    cursor: default;
    transition: width 0s;
  }
  .header_item:hover {
    background-color: #459f77;
  }
  .header_item span {
    position: absolute;
    top: 5px;
    right: 3px;
    height: 50px;
    width: 10px;
    line-height: 0.4;
    text-align: center;
    opacity: 0.2;
    color: grey;
    transition: all .3s;
    border-radius: 5px;
    cursor: e-resize;
  }
  .header_item span:hover {
    background-color: #318e65;
    color: #41b883;
    opacity: 1;
  }
  .col {
    display: flex;
    align-items: center;
    color: #3c3c3c;
    overflow: hidden;
    padding: 0px 20px;
  }
  .col:first-child {
    background-color: #41b883;
    position: sticky;
    left: 0;
    top: 0;
  }
  .col:first-child input {
    color: white;
  }
  .col input {
    background-color: transparent;
    border: none;
    cursor: pointer;
    color: #3c3c3c;
    outline: none;
    width: 100%;
    font-size: 20px;
    transition: all .2s;
    transition: width 0s;
  }
  .editable input {
    border-bottom: 1px solid #8BC34A;
    cursor: auto;
  }
  .editable:first-child {
    background-color: transparent;
  }
  .editable:first-child input {
    color: #3c3c3c !important;
  }
  .editable input:focus {
    border-bottom: 2px solid #8BC34A;
  }
  .download {
    width: 60px;
    height: 50px;
    position: fixed;
    box-shadow: -1px 1px 3px 3px #fdfffa9e;
    background-image: url(../assets/download_static.svg);
    background-position: 10px center;
    background-repeat: no-repeat;
    border: 1px solid white;
    background-size: 40px;
    background-color: #41b883;
    border-radius: 20px 0px 0px 20px;
    transition: background-image .5s;
    cursor: pointer;
    z-index: 10000;
    top: 20px;
    right: 0px;
  }
  .download > div{
    display: block;
    width: 100%;
    height: 100%;
  }
  .download:hover {
    background-image: url(../assets/download_active.svg);
  }
  .redact {
    background-image: url(../assets/redactOFF.svg);
    background-position: 10px center;
    border: 1px solid white;
    box-shadow: -1px 1px 3px 3px #fdfffa9e;
    background-repeat: no-repeat;
    background-size: 40px;
    background-color: #41b883;
    border-radius: 20px 0px 0px 20px;
    cursor: pointer;
    z-index: 10000;
    top: 90px;
    right: 0px;
    width: 60px;
    height: 50px;
    position: fixed;
  }
  .redact_on, .redact {
    transition: all .2s;
  }
  .redact_on, .redact:hover {
    background-image: url(../assets/redactOn.svg);
  }
  .download:active, .redact:active {
    background-size: 37px;
  }
  .error {
    position: fixed;
    z-index: 10000;
    top: 10px;
    right: 75px;
    color: grey;
    padding: 5px;
    border: 2px dotted #41b883;
    border-radius: 10px;
    cursor: pointer;
    background-color: white;
  }
  .error h5 {
    margin: 0px;
  }
  .table::-webkit-scrollbar{ width: 4px; height: 4px;}
  .table::-webkit-scrollbar-track { background-color: #c0f70c1c; }
  .table::-webkit-scrollbar-thumb { background-color: #41b883; }

  .btn_wrp {
    display: flex;
    margin-top: 5px;
    justify-content: space-around;
  }
  .save, .close {
    border: none;
    border-radius: 5px;
    padding: 5px;
    cursor: pointer;
    transition: all .1s;
  }
  .save {
    border: 1px solid #41b883;
    color: #49571a;
    background-color: transparent;
  }
  .save:hover {
    font-weight: 600;
    box-shadow: 1px 2px 4px #41b883;
  }
  .close {
    border: 2px solid #c2c2c2;
    color: #49571a;
    background-color: transparent;
  }
  .close:hover {
    font-weight: 600;
    box-shadow: 1px 2px 4px #c2c2c2;
  }
  .loading_status {
    position: fixed;
    bottom: 0;
    right: 10px;
    color: #98c400;
    font-size: 32px;
    font-weight: bold;
  }
  #fls {
    display: none;
  }
  .custom-file-upload {
    color: white;
    font-size: 30px;
    background-color: #41b883;
    margin-top: 15px;
    padding: 15px;
    border-radius: 10px;
    transition: all .2s;
    cursor: pointer;
  }
  .custom-file-upload:hover {
    box-shadow: 3px 4px 14px #7c8a97;
    border-radius: 5px;
  }
  .custom-file-upload:active {
    box-shadow: inset 3px 3px 15px 0px #35495e;
  }
</style>
