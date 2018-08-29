# WebMusic
FM Web音乐站 项目

## 预览地址
https://evenyao.github.io/FM-WebMusic

## 项目功能介绍
大屏 FM Web音乐站 项目
- 包含`40`类歌曲歌单
- 可通过左右切换按钮任意选择各种不种类的音乐
- 音乐加载完毕后，背景图会与该音乐专辑封面保持一致
- 每个种类歌单中包含若干首该种类的歌曲曲目，可通过暂停/继续播放、下一曲对音乐播放进行控制，也可以通过点击音乐进度条跳转到该曲目某特定时间点进行播放。
- 包含同步Lyric歌词


## 版本相关
### 2018.8.28
v0.1: 完成静态页面效果与布局 Demo
### 2018.8.29
v1.0: 完成所有基本逻辑和功能组件
### 其他
部分功能进行优化，详情见后 `细节优化`

# 项目技术细节总结
关键字: jQuery、CSS3、响应式、面向对象
## 布局要点
### 响应式
由于该作品可能会放置到宽度很长的设备上进行播放，类似于移动端相当于 `宽度vw` 进行布局自适应。
但该项目中，我们应该针对 `高度vh` 进行布局自适应，因为在实际情况中，用户的设备可能宽度很宽，如果使用 `vw` 会导致布局整体效果不佳。

### 毛玻璃 Background 效果
```CSS
.bg {
  position: absolute;
  z-index: -1;
  left: -10px;
  top: -10px;
  bottom: -10px;
  right: -10px;
  background: url("2.jpg") no-repeat center;
  background-size: cover;
  filter: blur(4px);
}
.bg::before {
  content: '';
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  right: 0;
  background: rgba(0,0,0,0.4);
}
```
### flex 布局
巧用 flex 使 iconfont 等比布局
```CSS
main .aside .actions {
  display: flex;
  margin-top: 4vh;
}
main .aside li {
  flex:1;
  text-align: center;
}
```

### footer 绝对定位
```CSS
footer .icon-left {
  position: absolute;
  left: -10vh;
}
footer .icon-right {
  position: absolute;
  right: -10vh;
}
```

## 逻辑要点
### 面向对象
#### 使用自定义事件中心
使用自定义事件中心，让 Main 与 Footer 不直接交互，而是通过事件中心进行间接交互，实现了解耦。
```JavaScript
var EventCenter = {
  on: function(type, handler){
    $(document).on(type, handler)
  },
  fire: function(type, data){
    $(document).trigger(type, data)
  }
}
```
### 组件分离
#### Footer组件
`init` 初始化后通过 `bind` 监听事件，通过 `render` 获取`JSON`数据。然后进行相应的 `DOM`操作、完成相应的逻辑。

#### Main组件
`init` 初始化后通过 `bind`监听事件，并通过 `EventCenter`自定义事件中心与 `footer` 中获取到的数据进行交互。改变相应的 `DOM`、完成相应的逻辑。

## 功能要点
### Footer
点击 `leftBtn` 和 `rightBtn` 左、右移动相应的 `歌单`
```JavaScript
//footer right右键事件
this.$rightBtn.on('click',function(){
  if(_this.isAnimate) return
  var itemWidth = _this.$box.find('li').outerWidth(true)
  var rowCount = parseInt(_this.$box.width()/_this.$box.find('li').outerWidth(true))

  if(!_this.isToEnd){  //判断，在不是最后一页的时候做以下逻辑
    _this.isAnimate = true   //设置animate状态为true
    _this.$ul.animate({
      left: '-=' + rowCount * itemWidth  //每次点击都让之前没显示完全的歌单封面变为第一个
    },400, function(){   //如果footer到达最后一个专辑底部条件达到
      _this.isAnimate = false  //完成animate之后 设置状态为false
      _this.$leftBtn.removeClass('disabled')   //将左边位置的disabled去掉
      _this.isToStart = false   //将isToStart置为false
      if(parseFloat(_this.$box.width()) - parseFloat(_this.$ul.css('left')) >= parseFloat(_this.$ul.css('width'))){
        _this.isToEnd = true   //将isToEnd置为true
        _this.$rightBtn.addClass('disabled')  //并且将rightBtn添加disabled样式
      }
    })
  }
})

//footer left左键事件
this.$leftBtn.on('click',function(){
  if(_this.isAnimate) return
  var itemWidth = _this.$box.find('li').outerWidth(true)
  var rowCount = parseInt(_this.$box.width()/_this.$box.find('li').outerWidth(true))

  if(!_this.isToStart){
    _this.isAnimate = true
    _this.$ul.animate({
      left: '+=' + rowCount *  itemWidth  //逻辑同上
    },400, function(){   //如果footer到达最后一个专辑底部条件达到
      _this.isAnimate = false
      _this.isToEnd = false
      if(parseFloat(_this.$ul.css('left')) >= 0){
        _this.isToStart = true   //将isToStart置为true
        _this.$leftBtn.addClass('disabled')  //并且将leftBtn添加disabled样式
      }
    })
  }
})
```

### Main
1. 操作 Main 中与音乐相关的 DOM
2. 歌曲时间/进度条 与 Lyric歌词
- 歌曲时间先对分秒进行格式化，再拼接，并将得到的分秒放置到HTML DOM中
- 进度条百分比为(当前歌曲时间/歌曲时间总长)`(this.audio.currentTime/this.audio.duration)*100 + '%'`
- 并设置点击相应的进度条位置跳转到相应歌曲时间，注意这个事件需要绑定到 `.bar` 上，而不是 `.bar-progress`
- Lyric歌词先从接口获取数据，然后进行正则匹配格式化后，再装入到lyricObj数组中，并按照歌曲时间让歌词拼装到 DOM 中进行显现
```JavaScript
// 请求歌词 与歌词格式化 组件
loadLyric(){
  var _this = this
  $.getJSON('https://jirenguapi.applinzi.com/fm/getLyric.php',{sid: this.song.sid}).done(function(ret){
    // console.log(ret.lyric)
    var lyric = ret.lyric
    var lyricObj = {}    //用来存放构建的歌词对象
    //格式化lyric
    lyric.split('\n').forEach(function(line){
      var times = line.match(/\d{2}:\d{2}/g)  //只取[00：00]，仅精确到秒
      var str = line.replace(/\[.+?\]/g,'')  //歌词
      if(Array.isArray(times)){
        times.forEach(function(time){
          lyricObj[time] = str
        })
      }
    })
    _this.lyricObj = lyricObj
  })
}
```
```JavaScript
updataStatus(){
  var _this = this
  var min = Math.floor(this.audio.currentTime/60)
  var sec = Math.floor(this.audio.currentTime)%60 + ''   //sec转换成字符串，便于下面进行判断
  sec = sec.length === 2 ? sec : '0' + sec  //三元运算判断秒数长度，如果个位秒数，在前加0
  this.$container.find('.current-time').text(min + ':' + sec)
  this.$container.find('.bar-progress').css('width',(this.audio.currentTime/this.audio.duration)*100 + '%')
  // console.log('update')

  //歌曲进度条选择事件
  $('#page-music').find('.bar').on('click',function(e){
    var percent = e.offsetX / parseInt($('#page-music').find('.bar').width())
    _this.audio.currentTime = _this.audio.duration * percent
  })

  // 填充歌词 DOM
  var line = this.lyricObj['0'+min+':'+sec]
  if(line){
    _this.$container.find('.lyric p').text(line)
  }
}
```


## 细节优化
### Footer
- 当音乐分类选择最初始状态时(即不能往左移时)，leftBtn是没有hover效果的，当右移一次，即添加hover效果，重新回到最左时，再次移除hover效果，即让用户了解，该 button 在此时点击无效(rightBtn同理)
- 当出现鼠标点击过快，导致leftBtn、rightBtn浏览到最后一页，仍旧出现左右移动的bug时。设置`isAnimate`值，用来判断动画是否还在进行中。并设置条件限制，当`animate`状态结束时，才能够进行左移右移，该bug即可修复。
- 当歌单被点击之后，给与相应的`li`新增一个css属性，让其拥有一个`box-shadow`边框。

### Main
- 当未选中任何音乐歌单时(即默认初始页面时)，使点击`icon-play`或`icon-next`没有任何交互。即设置`isLoaded`值，用来判断音乐是否已经加载(ajax数据是否获取到，即判断用户是否点击过footer中的歌单)，如果是，才允许交互事件发生。
