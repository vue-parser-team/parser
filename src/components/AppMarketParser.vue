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
              :title="col.__width <= 40 ? 'Развернуть | ' + constTitle : 'Свернуть | ' + constTitle"
              :style="{width: col.__width + 'px'}"
              @click.ctrl="goToUrl(col.link)">
              {{col.columnNameRU}}
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
                :key="row[col.columnName] + col.columnName + index"
                :style="{width: col.__width + 'px'}"
                >
                <input :readonly="!redact" v-model.lazy="row[col.columnName]">
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
// import _ from 'lodash'
import Papa from 'papaparse'
import JsonExcel from 'vue-json-excel'
const searchParamsConst = {
  parentCard: 'n-snippet-card',
  price: 'snippet-card__price',
  sellerName: 'n-snippet-card__shop-primary-info',
  shopRating: 'n-rating-stars',
  deliveryPrice: 'n-delivery__price',
  deliveryTime: 'n-delivery__time'
}
const cols = [
  {'columnName': 'itemName', 'columnNameRU': 'Товар', __width: '200'},
  {'columnName': 'sellerName', 'columnNameRU': 'Продавец', __width: '200'},
  {'columnName': 'price', 'columnNameRU': 'Цена', __width: '200'},
  {'columnName': 'shopRating', 'columnNameRU': 'Рейтинг продавца', __width: '200'},
  {'columnName': 'deliveryPrice', 'columnNameRU': 'Стоимость доставки', __width: '200'},
  {'columnName': 'deliveryTime', 'columnNameRU': 'Срок доставки', __width: '200'}
]
export default {
  name: 'app-parser',
  data () {
    return {
      status: 'Development in the process...',
      constTitle: 'Нажмите Ctrl + ЛКМ для перехода на страницу товара',
      redact: false,
      colResize: '',
      elResize: '',
      siteData: '',
      cols: cols,
      selectors: searchParamsConst,
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
          if (col.__width <= 200) {
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
    // Переход по ссылке на сайт оригинала
    goToUrl (url) {
      if (url) {
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
    // StartParsingMethoods //
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
    // Цикличный парсинг цен
    prepareTable (dataRows) {
      if (dataRows[1]) {
        dataRows.forEach((row, i) => {
          if (i !== 0 && row[0]) {
            let parse = JSON.parse(row[0])
            console.log(parse)
            this.tableDataParsing.push({
              'itemName': parse.name,
              'link': parse.link,
              'vId': parse.virtualityId,
              'sellerName': 'none',
              'price': 'none',
              'shopRating': 'none',
              'deliveryPrice': 'none',
              'deliveryTime': 'none'
            })
          }
        })
      }
      this.getPrices()
    },

    getPrices () {
      // this.tableParsed = _.cloneDeep(this.tableDataParsing)
      this.tableDataParsing.forEach(row => {
        if (row.link) {
          this.getUrl(row.link, row)
            .then(res => {
              console.log('resParsed = ', this.tableParsed)
            })
        }
      })
    },

    getUrl (url, row) {
      const lowCostFilter = '/offers?local-offers-first=0&how=aprice'
      return axios.get('js/request.php?url=' + url + lowCostFilter)
        .then(resp => {
          if (resp && !resp.headers['content-length']) {
            let parser = new DOMParser()
            let htmlDoc = parser.parseFromString(resp.data, 'text/html')
            return this.getInfo(htmlDoc, row)
          } else {
            setTimeout(() => {
              this.getUrl(url, row)
            }, 1000)
          }
        })
    },
    // Вытаскиваем значение со страницы
    getInfo (doc, row) {
      let cards = doc.getElementsByClassName(this.selectors.parentCard)
      Array.from(cards).forEach(item => {
        let itemPrice = this.getPrice(item)
        let itemSellerName = this.getSellerName(item)
        let itemShopRating = this.getShopRating(item)
        let itemDeliveryPrice = this.getDeliveryPrice(item)
        let itemDeliveryTime = this.getDeliveryTime(item)
        console.log('itemPrice = ', itemPrice)
        console.log('itemSellerName = ', itemSellerName)
        console.log('itemShopRating = ', itemShopRating)
        console.log('itemDeliveryPrice = ', itemDeliveryPrice)
        console.log('itemDeliveryTime = ', itemDeliveryTime)
        this.tableParsed.push({
          itemName: row.itemName,
          sellerName: itemSellerName,
          price: itemPrice,
          shopRating: itemShopRating,
          deliveryPrice: itemDeliveryPrice,
          deliveryTime: itemDeliveryTime
        })
        console.log('----------------------------------------------------')
        console.log('Парсить xml фид и затем связывать данные из фида по id с товаром')
      })
      let index = 0
      this.tableParsed.forEach((r, i) => {
        if (i !== 0) {
          if (r.itemName === this.tableParsed[index].itemName) {
            r.itemName = ''
          } else {
            index = i
          }
        }
      })
      return []
    },
    // Методы для получения информации из html
    getPrice (item) {
      item = item.getElementsByClassName(this.selectors.price)[0].innerText || 'null'
      // item = item.replace(/[^-0-9]/gi, '')
      return item
    },
    getSellerName (item) {
      return item.getElementsByClassName(this.selectors.sellerName)[0].innerText || '...None'
    },
    getShopRating (item) {
      return item.getElementsByClassName(this.selectors.shopRating)[0].dataset.rate || 'null'
    },
    getDeliveryPrice (item) {
      /* if (item.getElementsByClassName(this.selectors.deliveryPrice)[0]) {
        return item.getElementsByClassName(this.selectors.deliveryPrice)[0].innerText || 'null'
      } */
      return item.getElementsByClassName(this.selectors.deliveryPrice)[0].innerText || 'null'
    },
    getDeliveryTime (item) {
      /* if (item.getElementsByClassName(this.selectors.deliveryTime)[0]) {
        return item.getElementsByClassName(this.selectors.deliveryTime)[0].innerText || 'null'
      } */
      item = item.getElementsByClassName(this.selectors.deliveryTime)[0].innerText || 'null'
      return item.replace(',', '')
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
