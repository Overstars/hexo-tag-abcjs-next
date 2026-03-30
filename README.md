# hexo-tag-abcjs-next

一个面向 Hexo 的 abcjs 标签插件，实现了五线谱渲染、现代 synth 音频播放、播放过程高亮，不需要手动配置相关依赖。

基于[hexo-tag-abcjs](https://github.com/maiwenan/hexo-tag-abcjs)修改而来，所以使用时需先`npm uninstall`卸载原插件，否则会冲突，`_config.yml`相关配置可保留。

## 特性

- 支持 `{% abcjs %}...{% endabcjs %}` 标签
- 默认使用 abcjs basic CDN，无需手动拷贝 js/css 到站点目录
- 支持 synth 音频控件
- 支持播放中的音符高亮
- 支持 `autoplay`、`no-midi`、`no-animation` 标签参数
- 解决同页多个谱例时的脚本重复加载和竞态问题
- 兼容旧配置名：优先读取 `abcjs_next`，其次读取 `abcjs`

## 安装

```bash
npm install hexo-tag-abcjs-next
```

安装后无需额外注册，Hexo 会自动加载插件。

## 最小用法

```markdown
{% abcjs %}
X:1
T:Little Star
M:4/4
L:1/8
K:C
C2 C2 G2 G2 | A2 A2 G4 |
{% endabcjs %}
```

## 标签参数

```markdown
{% abcjs [autoplay] [no-midi] [no-animation] %}
...
{% endabcjs %}
```

- `autoplay`: 页面首次用户手势后自动开始播放
- `no-midi`: 当前谱例不显示音频控件
- `no-animation`: 当前谱例不做播放高亮

说明：现代浏览器限制页面在无用户手势时直接发声，所以这里的 autoplay 语义是“首个用户手势后自动播放”，不是页面打开瞬间强制出声。

## 配置

推荐在站点根目录 `_config.yml` 中使用 `abcjs_next`：

```yaml
abcjs_next:
	js: 'https://cdn.jsdelivr.net/npm/abcjs@6.2.0/dist/abcjs-basic-min.js'
	css: 'https://cdn.jsdelivr.net/npm/abcjs@6.2.0/abcjs-audio.css'
	scriptId: 'hexo-tag-abcjs-next'
	midi: true
	animation: true
	animationColors: ['#000000', '#3d9afc']
	options:
		startingTune: 0
		print: false
		visualTranspose: 0
		scale: 1
		responsive: 'resize'
		inlineControls:
			loopToggle: true
			standard: true
			tooltipLoop: 'Click to toggle play once/repeat.'
			tooltipReset: 'Click to go to beginning.'
			tooltipPlay: 'Click to play/pause.'
			tooltipProgress: 'Click to change the playback position.'
			tooltipWarp: 'Change the playback speed.'
```

如果你是从旧项目迁移，也可以继续使用 `abcjs:` 作为配置节名。

## 重要配置说明

- `js`: abcjs 脚本地址。默认是 CDN，可以改成你自己的本地地址。
- `css`: 音频控件样式地址。默认是 CDN，可以改成你自己的本地地址。
- `scriptId`: 注入到页面的 script id，用于避免重复加载。
- `midi`: 是否默认开启音频控件。
- `animation`: 是否默认开启播放高亮。
- `animationColors`: `[已播放颜色, 当前播放颜色]`。
- `options`: 透传给 abcjs。

## inlineControls 说明

当前实现里会识别这些字段：

- `loopToggle`: 是否显示循环按钮
- `standard`: 是否整体显示 restart、play、progress 这组三个标准控件
- `restart`: 单独控制 restart，默认跟随 `standard`
- `play`: 单独控制 play，默认跟随 `standard`
- `progress`: 单独控制 progress，默认跟随 `standard`
- `warp`: 是否显示速度调节
- `tooltipLoop`: 循环按钮提示文案
- `tooltipReset`: 重置按钮提示文案
- `tooltipPlay`: 播放按钮提示文案
- `tooltipProgress`: 进度条提示文案
- `tooltipWarp`: 速度输入框提示文案

## 自定义本地资源

如果你不想走 CDN，可以改成站点自己的静态资源：

```yaml
abcjs_next:
	js: '/js/abcjs-basic-min.js'
	css: '/css/abcjs-audio.css'
```

源文件可从[abcjs](https://github.com/paulrosen/abcjs)获取，这时请自行确保这两个文件可以被 Hexo 正常发布。

## 适用范围

这个包专注 Hexo 页面中的谱例渲染，不包含编辑器侧功能，也不会自动把 abc 代码块转换成互动编辑器。

## License

MIT