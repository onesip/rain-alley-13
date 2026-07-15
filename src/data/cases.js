const asset = name => `${import.meta.env.BASE_URL}assets/${name}`

export const cases = [
  {
    id: 'bird', number: '001', title: '不会报时的夜莺钟',
    description: '黄铜，发条结构。送来时仍有体温。',
    objectArt: asset('nightingale-clock.webp'), characterArt: asset('elise.webp'),
    visitor: '伊莉丝女士', address: '白榆街 8 号', intent: '典当',
    opening: '它从昨晚起就不肯报时了。只是坏了一点，对吧？',
    clues: [
      { id:'eye', x:73, y:15, label:'玻璃眼珠', text:'眼珠里映出的不是你，而是一扇标着“13”的绿门。' },
      { id:'clock', x:55, y:76, label:'异常表盘', text:'表盘停在 1:13；钟面却只有八个刻度。' },
      { id:'bell', x:76, y:46, label:'封住的铃锤', text:'铃锤沾着新鲜白蜡。有人故意不让它发声。' },
      { id:'wing', x:43, y:25, label:'左翼刻痕', text:'左翼内侧刻着：III · I · III。' },
    ],
    questions: [
      ['这只钟原来属于谁？','我母亲。她去世前一天把它寄给我……等等，也可能是后一天。'],
      ['昨晚究竟发生了什么？','它敲了十三下。楼上的住户来敲门，可我家没有楼上。'],
      ['为什么封住铃锤？','不是我做的。她把手藏到身后，指甲缝里有同样的白蜡。'],
      ['你认识雨巷十三号吗？','她望向你身后的门牌：这里不是十二号吗？'],
    ],
    code: '313', conclusion: '夜莺没有损坏。它在提醒一个被小镇删掉的日期：三月十三日。',
    hints: ['组成答案的数字都刻在夜莺本身。','翅膀内侧的罗马数字不是装饰。','III · I · III，就是 3 · 1 · 3。'],
    decisions: [
      { id:'buy', title:'收进档案', caption:'支付 28 克朗，保留奇物', coins:-28, rep:1, archive:true, outcome:'午夜后，它第一次开口，唱的是你的名字。' },
      { id:'return', title:'归还客人', caption:'收取 18 克朗鉴定费', coins:18, rep:0, outcome:'两夜之后，白榆街 8 号开始每天多出一层楼。' },
      { id:'auction', title:'送往拍卖', caption:'高价，但买家身份未知', coins:72, rep:-1, outcome:'买家没有留下名字，只留下十三根湿羽毛。' },
      { id:'seal', title:'封存拒收', caption:'不让它离开事务所', coins:0, rep:1, archive:true, outcome:'铃锤虽然被封住，后墙仍在凌晨一点十三分震动。' },
    ],
  },
  {
    id: 'key', number: '002', title: '星期八的房门钥匙',
    description: '铁钥匙，齿纹每天都会改变一次。',
    objectArt: asset('eighth-day-key.webp'), characterArt: asset('raincoat-boy.webp'),
    visitor: '穿雨衣的男孩', address: '没有登记', intent: '寻门',
    opening: '它能打开我家的门。可是大人把那一天拆掉了。',
    clues: [
      { id:'ring', x:35, y:31, label:'八道磨痕', text:'钥匙环内侧有八道磨痕，最后一道比其他都新。' },
      { id:'eight', x:41, y:38, label:'生长的数字', text:'数字 8 不是刻上去的，像是从金属里面长出来。' },
      { id:'teeth', x:72, y:73, label:'十三号齿纹', text:'钥匙齿纹与事务所十三号后门完全吻合。' },
      { id:'thread', x:72, y:45, label:'红线结', text:'红线打了一个长结、三个短结，另一端消失在墙里。' },
    ],
    questions: [
      ['你家在哪里？','雨巷尽头。门牌被摘掉了，但屋里的人还在吃晚饭。'],
      ['今天星期几？','你们叫它星期三。我们叫它门关上的第二天。'],
      ['谁给你的钥匙？','是你。只是那时你比现在老。'],
      ['你为什么没有影子？','男孩低头看了一眼：借给下一位客人了。'],
    ],
    code: '813', conclusion: '钥匙不是用来开门，而是把“第八天”锁在雨巷十三号里面。',
    hints: ['从钥匙最圆的部分开始，再沿红线向外读。','钥匙环给第一位；红线结给后两位。','八道磨痕、一个长结、三个短结：8 · 1 · 3。'],
    decisions: [
      { id:'buy', title:'留下钥匙', caption:'支付 34 克朗，开启后门', coins:-34, rep:1, archive:true, outcome:'后门后面出现了一段昨天不存在的楼梯。' },
      { id:'return', title:'交给男孩', caption:'让他自己寻找那扇门', coins:0, rep:2, outcome:'他道谢后走进墙里。墙纸后传来一家人吃饭的声音。' },
      { id:'auction', title:'匿名拍卖', caption:'钥匙会选择自己的买家', coins:96, rep:-2, outcome:'拍卖结束后，镇上所有日历同时多出一格。' },
      { id:'seal', title:'钉入门框', caption:'花费 10 克朗稳定日期', coins:-10, rep:2, archive:true, outcome:'今晚没有人消失，但你的影子迟到了三秒。' },
    ],
  },
  {
    id: 'jar', number: '003', title: '吃掉影子的糖罐',
    description: '磨砂玻璃。里面的糖会在无人注视时减少。',
    objectArt: asset('shadow-sugar-jar.webp'), characterArt: asset('no-reflection-lady.webp'),
    visitor: '没有倒影的太太', address: '不存在的四楼', intent: '赎回',
    opening: '我丈夫把它典当给你了。请还给我——在它学会我的声音以前。',
    clues: [
      { id:'lid', x:52, y:29, label:'三个名字', text:'罐盖内沿刻着三个人名，其中一个与你同名。' },
      { id:'sugar', x:50, y:47, label:'黑糖圆环', text:'八粒黑糖围着一个空心圆；它们拒绝被打乱。' },
      { id:'face', x:50, y:61, label:'说谎的笑脸', text:'罐中的笑脸只在客人说谎时出现。现在它正在笑。' },
      { id:'shadow', x:51, y:78, label:'数字形影子', text:'罐底的影子弯成数字 8，偶尔会变成穿雨衣的男孩。' },
    ],
    questions: [
      ['你丈夫叫什么？','我没有丈夫。她停顿了一下：至少这个星期没有。'],
      ['为什么罐子会学声音？','它吃掉影子后，就用那个人的声音把下一个人骗来。'],
      ['男孩把影子借给了谁？','你已经见过他了？那就太迟了。'],
      ['你带伞了吗？','她的手是空的，地板上却出现一把伞形的湿痕。'],
    ],
    code: '808', conclusion: '糖罐是一只诱饵。它模仿失踪者，替雨巷十三号寻找下一位住户。',
    hints: ['证词会变化，但糖粒的位置和罐底影子不会。','从上到下读：糖粒数量、围出的形状、影子的形状。','八粒糖、空心圆、数字形影子：8 · 0 · 8。'],
    decisions: [
      { id:'buy', title:'收入地下档案', caption:'支付 42 克朗', coins:-42, rep:2, archive:true, outcome:'地下档案里，多出一份由你亲手写成的失踪名单。' },
      { id:'return', title:'交给她', caption:'获得 60 克朗', coins:60, rep:-2, outcome:'她走后，事务所里每件物品都用她的声音说晚安。' },
      { id:'auction', title:'作为压轴拍品', caption:'利润极高，风险未知', coins:130, rep:-3, outcome:'拍卖钟没有停。窗外的夜晚也没有。' },
      { id:'seal', title:'用影子封口', caption:'代价暂时未知', coins:0, rep:3, archive:true, outcome:'糖罐安静了。第二天，你的影子没有来上班。' },
    ],
  },
]

export const auctionLots = [
  { id:'tea', icon:'🫖', title:'倒流的茶壶', description:'倒出的茶会回到昨天。', price:26 },
  { id:'glove', icon:'🧤', title:'第六根手指的手套', description:'尺码合适得令人不安。', price:38 },
  { id:'portrait', icon:'🖼️', title:'缺少观众的肖像', description:'画中人坚持你站得太近。', price:51 },
]
