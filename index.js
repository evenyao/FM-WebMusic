//自定义事件中心 (使main ,footer 与中心交互)
var EventCenter = {
  on: function(type, handler){
    $(document).on(type, handler)
  },
  fire: function(type, data){
    $(document).trigger(type, data)
  }
}


//footer 模块
var Footer = {
  init: function(){
    this.$footer = $('footer')
    this.$ul = this.$footer.find('ul')
    this.$box = this.$footer.find('.box')
    this.$leftBtn = this.$footer.find('.icon-left')
    this.$rightBtn = this.$footer.find('.icon-right')
    this.isToEnd = false  //footer专辑位置是否最后
    this.isToStart = true
    this.isAnimate = false  //动画播放状态，用来控制连续点击的相应。修复快速点击造成的footer移动bug

    this.bind()
    this.render()
  },

  bind: function(){
    var _this = this
    $(window).resize(function(){
      _this.setStyle()
    })
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

    //设置footer点击事件
    this.$footer.on('click','li',function(){
      $(this).addClass('active').siblings().removeClass('active')

      EventCenter.fire('select-albumn',{
        channelId: $(this).attr('data-channel-id'),
        channelName: $(this).attr('data-channel-name')
      })
    })
  },

  // ajax 请求channels数据
  render(){
    var _this = this
    $.getJSON('https://jirenguapi.applinzi.com/fm/getChannels.php').done(function(ret){
      console.log(ret)
      _this.renderFooter(ret.channels)
    }).fail(function(){
      console.log('error')
    })
  },

  // DOM操作
  renderFooter: function(channels){
    console.log(channels)
    var html = ''
    channels.forEach(function(channel){
      html += '<li data-channel-id='+channel.channel_id+' data-channel-name='+channel.name+'>'
            + ' <div class="cover" style="background-image:url('+channel.cover_small+')"></div>'
            + ' <h3>'+channel.name+'</h3>'
            + '</li>'
    })
    this.$ul.html(html)
    this.setStyle()
  },

  // 设置 footer 专辑选择样式
  setStyle: function(){
    var count = this.$footer.find('li').length     //li总数
    var width = this.$footer.find('li').outerWidth(true)   //li宽度
    this.$ul.css({
      width: count * width + 'px'
    })
  }
}


//Main 模块
var Main = {
  init: function(){
    this.$container = $('#page-music')
    this.audio = new Audio()
    this.audio.autoplay = true
    this.isLoaded = false

    this.bind()
  },
  bind: function(){
    var _this = this
    EventCenter.on('select-albumn',function(e, channelObj){
      _this.channelId = channelObj.channelId
      _this.channelName = channelObj.channelName
      _this.loadMusic()
      console.log('select ', _this.channelId, '| tag ',_this.channelName)
    })

    //播放 actions 界面 操作事件 暂停与播放
    this.$container.find('.btn-play').on('click',function(){
      var $btn = $(this)
      if(!_this.isLoaded) return   //禁止默认界面按钮切换
      if($btn.hasClass('icon-play')){
        $btn.removeClass('icon-play').addClass('icon-pause')
        _this.audio.play()
      }else{
        $btn.removeClass('icon-pause').addClass('icon-play')
        _this.audio.pause()
      }
    })

    //播放 actions 界面 操作事件 下一曲
    this.$container.find('.btn-next').on('click',function(){
      if(_this.isLoaded){  //如果isLoad为true 可以进行下一曲的切换
        _this.loadMusic()
      }
    })


    this.audio.addEventListener('play',function(){
      console.log('play')
      clearInterval(_this.statusClock)  //每次播放之前先清除计时器
      _this.statusClock = setInterval(function(){
        _this.updataStatus()
      },1000)
    })

    this.audio.addEventListener('pause',function(){
      console.log('pause')
      clearInterval(_this.statusClock)
    })

  },

  // ajax 请求歌曲数据
  loadMusic(){
    var _this = this
    console.log('loadMusic...')
    $.getJSON('https://jirenguapi.applinzi.com/fm/getSong.php',{channel: this.channelId}).done(function(ret){
      _this.song = ret['song'][0]
      // console.log(ret['song'][0])
      _this.isLoaded = true   //请求一次数据过后，标记isLoad为true
      _this.setMusic()
      _this.loadLyric()
    })
  },

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
  },

  //操作 Main 中与音乐相关的 DOM
  setMusic(){
    console.log('set music...')
    console.log(this.song)
    this.audio.src = this.song.url
    this.$container.find('.btn-play').addClass('icon-pause').removeClass('icon-play')
    $('.bg').css('background-image','url('+this.song.picture+')')
    this.$container.find('.aside figure').css('background','url('+this.song.picture+')')
    this.$container.find('.detail h1').text(this.song.title)
    this.$container.find('.detail .author').text(this.song.artist)
    this.$container.find('.tag').text(this.channelName)
  },

  //更新 进度条与歌曲时间 状态
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
}

Footer.init()
Main.init()
