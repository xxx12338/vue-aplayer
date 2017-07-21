import Vue from 'vue'
import Component from 'vue-class-component'
import WithRender from './Lyric.html?style=./Lyric.scss'

import { Prop, Watch } from 'vue-property-decorator'
import Axios from 'axios'

export interface LRC {
  time: number
  text: string
}

@WithRender
@Component
export class Lyric extends Vue {

  @Prop({ type: String, required: false })
  public readonly lrc: string
  @Prop({ type: Number, required: false, default: 0 })
  public readonly currentTime: number

  /** 获取解析后的歌词文本 */
  private currentLRC: string = null
  private LRC: Array<LRC> = []

  public get current (): LRC {
    const match = this.LRC.filter(x => x.time < this.currentTime * 1000)
    if (match && match.length > 0) return match[match.length - 1]
    return this.LRC[0]
  }

  public get transform (): { transitionDuration?: string, transform: string } {
    return {
      transitionDuration: `${this.transitionDuration}ms`,
      transform: `translate3d(0, ${this.translateY}px, 0)`
    }
  }

  public get translateY (): number {
    const { time } = this.current || { time: 0 }
    const lrcElements = this.$refs.lrc as Array<HTMLElement> || []
    const currentElement = lrcElements.find(x => Number.parseInt(x.dataset.time) === time)
    return (currentElement ? currentElement.offsetTop : 0) * -1
  }

  private get transitionDuration (): number {
    return this.LRC.length > 1 ? 500 : 0
  }

  private created (): void {
    this.change()
  }

  @Watch('lrc')
  private change (): void {
    this.LRC = []
    this.currentLRC = null
    this.parseLRC()
  }

  private async parseLRC (): Promise<void> {
    if (!this.lrc || this.lrc === 'loading') return
    if (this.isURL(this.lrc)) { // 如果歌词是一个URL地址则请求该地址获得歌词文本
      const { data } = await Axios.get(this.lrc.toString())
      this.currentLRC = data
    } else this.currentLRC = this.lrc

    const reg = /\[(\d+):(\d+)[.|:](\d+)\](.+)/
    const regTime = /\[(\d+):(\d+)[.|:](\d+)\]/g
    const matchAll = line => {
      const match = line.match(reg)
      if (!match) return
      if (match.length !== 5) return
      const minutes = Number.parseInt(match[1])
      const seconds = Number.parseInt(match[2])
      const milliseconds = Number.parseInt(match[3])
      const time = minutes * 60 * 1000 + seconds * 1000 + milliseconds
      const text = (match[4] as string).replace(regTime, '')
      this.LRC.push({ time, text })
      matchAll(match[4]) // 递归匹配多个时间标签
    }

    this.LRC = []
    this.currentLRC.replace(/\\n/g, '\n').split('\n').forEach(line => matchAll(line))

    // 歌词格式不支持
    if (this.LRC.length <= 0) this.LRC = [{ time: -1, text: '(・∀・*) 抱歉，该歌词格式不支持' }]
    else this.LRC.sort((a, b) => a.time - b.time)
  }

  private isURL (url: string): boolean {
    const uri = /^http(s)?:\/\/([\w-]+\.)+[\w-]+(\/[\w- ./?%&=]*)?$/
    const path = /.*\/[^\/]+\.[^\.]+$/
    const wrap = /(\r\n)|(\\r\\n)|(\n)|(\\n)/
    return uri.test(url.toString()) || (path.test(url) && !wrap.test(url))
  }

}
