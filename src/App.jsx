import { useEffect, useMemo, useState } from 'react'
import { auctionLots, cases } from './data/cases.js'
import { audio } from './audio.js'

const SAVE_KEY = 'rain-alley-13-v2'
const initialState = {
  started:false, caseIndex:0, night:1, coins:80, reputation:0,
  found:{}, asked:{}, hints:{}, wrong:{}, solved:{}, decisions:{},
  archive:[], auction:[], ledger:[], chapterEnded:false, saveVersion:3,
}

function readSave(){
  try {
    const saved=JSON.parse(localStorage.getItem(SAVE_KEY) || '{}')
    const merged={ ...initialState, ...saved, saveVersion:3 }
    if(saved.saveVersion!==3 && saved.chapterEnded && saved.caseIndex===2){
      merged.caseIndex=3;merged.night=Math.max(4,saved.night||1);merged.chapterEnded=false
    }
    return merged
  }
  catch { return initialState }
}

function getWorldline(decisions={}){
  const score={keeper:0,mercy:0,broker:0}
  Object.values(decisions).forEach(choice=>{
    if(choice==='return') score.mercy++
    else if(choice==='auction') score.broker++
    else if(choice==='buy'||choice==='seal') score.keeper++
  })
  const entries=Object.entries(score).sort((a,b)=>b[1]-a[1])
  const tied=entries.length>1&&entries[0][1]===entries[1][1]
  return {score,dominant:tied?'crossroads':entries[0][0],total:Object.keys(decisions).length}
}

export default function App(){
  const [game,setGame] = useState(readSave)
  const [scene,setScene] = useState('counter')
  const [activeClue,setActiveClue] = useState(null)
  const [activeAnswer,setActiveAnswer] = useState(null)
  const [code,setCode] = useState(['','',''])
  const [outcome,setOutcome] = useState(null)
  const [settingsOpen,setSettingsOpen] = useState(false)
  const [audioSettings,setAudioSettings] = useState(()=>audio.getSettings())
  const [installPrompt,setInstallPrompt] = useState(null)
  const [standalone,setStandalone] = useState(()=>window.matchMedia?.('(display-mode: standalone)').matches||Boolean(navigator.standalone))
  const current = cases[Math.min(game.caseIndex,cases.length-1)]
  const found = game.found[current.id] || []
  const asked = game.asked[current.id] || []
  const hintLevel = game.hints[current.id] || 0
  const solved = Boolean(game.solved[current.id])
  const completeness = Math.min(100,(found.length + asked.length + (solved?2:0))*10)

  useEffect(()=>localStorage.setItem(SAVE_KEY,JSON.stringify(game)),[game])
  useEffect(()=>{ setActiveClue(null);setActiveAnswer(null);setCode(['','','']); },[game.caseIndex])
  useEffect(()=>audio.setMood(scene),[scene])
  useEffect(()=>{
    const beforeInstall=event=>{event.preventDefault();setInstallPrompt(event)}
    const installed=()=>{setInstallPrompt(null);setStandalone(true)}
    window.addEventListener('beforeinstallprompt',beforeInstall)
    window.addEventListener('appinstalled',installed)
    return ()=>{window.removeEventListener('beforeinstallprompt',beforeInstall);window.removeEventListener('appinstalled',installed)}
  },[])

  const mutate = fn => setGame(prev=>fn(structuredClone(prev)))
  const pulse = () => navigator.vibrate?.(18)
  const goScene = next=>{audio.start();audio.play('page');setScene(next)}

  async function installApp(){
    if(!installPrompt){setSettingsOpen(true);return}
    await installPrompt.prompt()
    const result=await installPrompt.userChoice
    if(result.outcome==='accepted') setInstallPrompt(null)
  }

  function changeAudio(next){setAudioSettings(audio.update(next))}

  function beginGame(){
    audio.start();audio.play('door')
    mutate(next=>{next.started=true;return next})
  }

  function discover(clue){
    pulse();audio.play('clue');setActiveClue(clue)
    if(found.includes(clue.id)) return
    mutate(next=>{ next.found[current.id]=[...(next.found[current.id]||[]),clue.id];return next })
  }

  function askQuestion(index){
    pulse();audio.play('question');setActiveAnswer(index)
    if(asked.includes(index)) return
    mutate(next=>{ next.asked[current.id]=[...(next.asked[current.id]||[]),index];return next })
  }

  function revealHint(){
    audio.play('hint')
    mutate(next=>{next.hints[current.id]=Math.min(3,(next.hints[current.id]||0)+1);return next})
  }

  function submitCode(){
    if(code.join('')===current.code){
      pulse();audio.play('success');mutate(next=>{next.solved[current.id]=true;return next})
    } else {
      pulse();audio.play('wrong');mutate(next=>{next.wrong[current.id]=(next.wrong[current.id]||0)+1;return next})
      setCode(['','',''])
    }
  }

  function decide(decision){
    if(game.decisions[current.id]) return
    audio.play('decision')
    mutate(next=>{
      next.coins=Math.max(0,next.coins+decision.coins)
      next.reputation+=decision.rep
      next.decisions[current.id]=decision.id
      if(decision.archive&&!next.archive.includes(current.id)) next.archive.push(current.id)
      next.ledger.push({night:next.night,item:current.title,choice:decision.title,outcome:decision.outcome,coins:decision.coins,rep:decision.rep})
      return next
    })
    setOutcome(decision)
  }

  function continueNight(){
    audio.play('door')
    setOutcome(null)
    if(game.caseIndex < cases.length-1){
      mutate(next=>{next.caseIndex++;next.night++;return next})
      setScene('counter')
    } else {
      mutate(next=>{next.chapterEnded=true;return next})
      setScene('ending')
    }
  }

  function buyLot(lot){
    if(game.coins<lot.price||game.auction.includes(lot.id)) return
    audio.play('auction')
    mutate(next=>{next.coins-=lot.price;next.auction.push(lot.id);next.ledger.push({night:next.night,item:lot.title,choice:'拍卖购入',outcome:'隔壁档案柜在它入库时轻轻敲了三下。',coins:-lot.price,rep:0});return next})
  }

  function resetGame(){
    if(!confirm('确定清除全部营业记录，重新继承事务所吗？')) return
    localStorage.removeItem(SAVE_KEY);setGame(initialState);setScene('counter');setOutcome(null)
  }

  if(!game.started) return <><Intro onStart={beginGame} onInstall={installApp} standalone={standalone}/>{settingsOpen&&<SettingsPanel settings={audioSettings} changeAudio={changeAudio} onClose={()=>setSettingsOpen(false)} installPrompt={installPrompt} standalone={standalone} onInstall={installApp}/>}</>

  return <div className="game-shell">
    <div className="rain-layer" />
    <Hud game={game} onScene={goScene} onSettings={()=>setSettingsOpen(true)}/>
    <main className={`scene scene-${scene}`}>
      {['counter','inspect','question','solve'].includes(scene) && <CaseHeader current={current} completeness={completeness}/>}
      {scene==='counter' && <CounterScene current={current} setScene={goScene} solved={solved}/>}
      {scene==='inspect' && <InspectScene current={current} found={found} activeClue={activeClue} discover={discover}/>}
      {scene==='question' && <QuestionScene current={current} asked={asked} activeAnswer={activeAnswer} askQuestion={askQuestion}/>}
      {scene==='solve' && <SolveScene current={current} found={found} asked={asked} hintLevel={hintLevel} revealHint={revealHint} code={code} setCode={setCode} submitCode={submitCode} solved={solved} wrong={game.wrong[current.id]||0} decide={decide} previousDecision={game.decisions[current.id]} onContinue={continueNight}/>}
      {scene==='archive' && <ArchiveScene game={game}/>}
      {scene==='auction' && <AuctionScene game={game} buyLot={buyLot}/>}
      {scene==='fate' && <FateScene game={game}/>}
      {scene==='ledger' && <LedgerScene game={game}/>}
      {scene==='ending' && <Ending game={game} onFate={()=>goScene('fate')}/>}
    </main>
    {['counter','inspect','question','solve'].includes(scene) && <CaseNav scene={scene} setScene={goScene} solved={solved}/>}
    {outcome && <Outcome decision={outcome} current={current} onContinue={continueNight} last={game.caseIndex===cases.length-1}/>}
    {settingsOpen&&<SettingsPanel settings={audioSettings} changeAudio={changeAudio} onClose={()=>setSettingsOpen(false)} installPrompt={installPrompt} standalone={standalone} onInstall={installApp} onReset={resetGame}/>}
  </div>
}

function Intro({onStart,onInstall,standalone}){
  return <div className="intro-screen">
    <div className="intro-fog"/><div className="intro-content">
      <div className="door-mark"><img src={`${import.meta.env.BASE_URL}assets/rain-alley-logo.webp`} alt="雨巷十三号徽记"/></div>
      <p className="kicker">CURIO · AUCTION · COMMISSION</p>
      <h1>雨巷十三号</h1><h2>奇物事务所</h2>
      <p className="intro-copy">这里收购旧物、秘密，以及偶尔仍在呼吸的东西。<br/>请谨慎估价——客人支付的未必是钱。</p>
      <button className="ornate-button" onClick={onStart}>推门营业 <i>→</i></button>
      {!standalone&&<button className="install-entry" onClick={onInstall}>安装到手机主屏幕</button>}
      <small>第一章 · 消失的星期八</small>
    </div>
  </div>
}

function Hud({game,onScene,onSettings}){
  return <header className="hud">
    <button className="brand-button" onClick={()=>onScene('counter')}><span className="brand-moon"><img src={`${import.meta.env.BASE_URL}assets/rain-alley-logo.webp`} alt=""/></span><span><b>雨巷十三号</b><small>奇物事务所</small></span></button>
    <div className="hud-stats"><span>第 <b>{game.night}</b> 夜</span><span>克朗 <b>{game.coins}</b></span><span>声誉 <b>{game.reputation}</b></span></div>
    <nav className="world-nav">
      <button onClick={()=>onScene('archive')}>档案室</button><button onClick={()=>onScene('auction')}>拍卖厅</button><button onClick={()=>onScene('fate')}>命线</button><button onClick={()=>onScene('ledger')}>营业簿</button><button className="settings-button" onClick={onSettings} aria-label="设置"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1-2.8 2.8-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.6v.2h-4V21a1.7 1.7 0 0 0-1-1.6 1.7 1.7 0 0 0-1.9.3l-.1.1L4.2 17l.1-.1a1.7 1.7 0 0 0 .3-1.9A1.7 1.7 0 0 0 3 14H2.8v-4H3a1.7 1.7 0 0 0 1.6-1 1.7 1.7 0 0 0-.3-1.9L4.2 7 7 4.2l.1.1a1.7 1.7 0 0 0 1.9.3A1.7 1.7 0 0 0 10 3v-.2h4V3a1.7 1.7 0 0 0 1 1.6 1.7 1.7 0 0 0 1.9-.3l.1-.1L19.8 7l-.1.1a1.7 1.7 0 0 0-.3 1.9 1.7 1.7 0 0 0 1.6 1h.2v4H21a1.7 1.7 0 0 0-1.6 1Z"/></svg></button>
    </nav>
  </header>
}

function SettingsPanel({settings,changeAudio,onClose,installPrompt,standalone,onInstall,onReset}){
  const isiOS=/iPad|iPhone|iPod/.test(navigator.userAgent)&&!window.MSStream
  return <div className="settings-overlay" onClick={onClose}><section className="settings-panel" onClick={event=>event.stopPropagation()}>
    <header><img src={`${import.meta.env.BASE_URL}assets/rain-alley-logo.webp`} alt=""/><span><small>RAIN ALLEY NO. 13</small><h2>事务所设置</h2></span><button onClick={onClose} aria-label="关闭">×</button></header>
    <div className="setting-row"><span><b>雨夜环境与音乐</b><small>雨声、室内低鸣与偶尔响起的钟音</small></span><button className={settings.ambient?'switch on':'switch'} onClick={()=>changeAudio({ambient:!settings.ambient})}><i/></button></div>
    <div className="setting-row"><span><b>交互音效</b><small>发现线索、问话、鉴定、落槌与开门声</small></span><button className={settings.effects?'switch on':'switch'} onClick={()=>changeAudio({effects:!settings.effects})}><i/></button></div>
    <label className="volume-row"><span><b>总音量</b><small>{Math.round(settings.volume*100)}%</small></span><input type="range" min="0" max="1" step="0.05" value={settings.volume} onChange={event=>changeAudio({volume:Number(event.target.value)})}/></label>
    <div className="install-card"><img src={`${import.meta.env.BASE_URL}icons/icon-192.png`} alt="雨巷十三号 App 图标"/><span><b>{standalone?'已经作为 App 打开':'安装雨巷十三号'}</b><small>{standalone?'当前是独立全屏模式，存档仍保存在这台设备。':isiOS?'在 Safari 中点“分享”，再选“添加到主屏幕”。':'安装后会拥有独立图标、全屏界面，并可缓存已加载内容。'}</small></span>{!standalone&&<button onClick={onInstall}>{installPrompt?'立即安装':'查看方法'}</button>}</div>
    {onReset&&<button className="danger-action" onClick={onReset}>清除营业记录并重新开始</button>}
    <p className="settings-foot">声音只会在你首次触碰屏幕后播放；系统静音或省电模式仍可能限制音频。</p>
  </section></div>
}

function CaseHeader({current,completeness}){
  return <div className="case-plaque"><span>委托 № {current.number}</span><b>{current.title}</b><i style={{'--progress':`${completeness}%`}}>{completeness}%</i></div>
}

function CounterScene({current,setScene,solved}){
  return <div className="counter-stage">
    <div className="counter-object"><img src={current.objectArt} alt={current.title}/><div className="object-caption"><small>本夜来物</small><b>{current.title}</b></div></div>
    <figure className="full-character"><img src={current.characterArt} alt={`${current.visitor}立绘`}/></figure>
    <div className="visitor-tag"><span>{current.visitor}</span><small>{current.address} · {current.intent}</small></div>
    <div className="dialogue-box">
      <span className="speaker">{current.visitor}</span><p>“{current.opening}”</p>
      <div className="quick-actions"><button onClick={()=>setScene('inspect')}>拿到灯下观察</button><button onClick={()=>setScene('question')}>先问几个问题</button><button onClick={()=>setScene('solve')}>{solved?'查看鉴定结论':'尝试鉴定'}</button></div>
    </div>
  </div>
}

function InspectScene({current,found,activeClue,discover}){
  return <div className="inspection-stage">
    <div className="inspection-copy"><span>OBJECT EXAMINATION</span><h2>把可疑的地方<br/>逐一找出来</h2><p>{current.description}</p></div>
    <div className="inspection-table">
      <img src={current.objectArt} alt={current.title}/>
      {current.clues.map((clue,index)=><button key={clue.id} className={`evidence-pin ${found.includes(clue.id)?'found':''}`} style={{left:`${clue.x}%`,top:`${clue.y}%`}} onClick={()=>discover(clue)}><span>{found.includes(clue.id)?'✓':index+1}</span></button>)}
    </div>
    <div className={`clue-reveal ${activeClue?'visible':''}`}>
      {activeClue?<><small>发现证据</small><b>{activeClue.label}</b><p>{activeClue.text}</p></>:<><small>检视提示</small><b>点击发光标记</b><p>已找到 {found.length}/{current.clues.length} 处异常。每一处都可能改变估价。</p></>}
    </div>
  </div>
}

function QuestionScene({current,asked,activeAnswer,askQuestion}){
  return <div className="interview-stage">
    <figure className="interview-character"><img src={current.characterArt} alt={`${current.visitor}完整立绘`}/></figure>
    <div className="question-space"><span className="scene-label">INTERVIEW · {current.visitor}</span><h2>别只听答案。<br/>也看她如何回答。</h2>
      <div className="question-list">{current.questions.map((q,i)=><button className={asked.includes(i)?'asked':''} key={q[0]} onClick={()=>askQuestion(i)}><em>{String(i+1).padStart(2,'0')}</em>{q[0]}<span>→</span></button>)}</div>
    </div>
    <div className={`answer-box ${activeAnswer!==null?'visible':''}`}>{activeAnswer!==null?<><b>{current.visitor}</b><p>“{current.questions[activeAnswer][1]}”</p></>:<p>选择一个问题。客人会记得你问过什么。</p>}</div>
  </div>
}

function SolveScene({current,found,asked,hintLevel,revealHint,code,setCode,submitCode,solved,wrong,decide,previousDecision,onContinue}){
  const evidence = useMemo(()=>current.clues.filter(c=>found.includes(c.id)),[current,found])
  const recorded=current.decisions.find(d=>d.id===previousDecision)
  return <div className="solve-stage">
    <section className="evidence-board"><span className="scene-label">YOUR EVIDENCE</span><h2>今晚的证据</h2>
      <div className="evidence-list">{evidence.length?evidence.map((c,i)=><div key={c.id}><em>{i+1}</em><span><b>{c.label}</b><small>{c.text}</small></span></div>):<p>你还没有认真观察这件奇物。</p>}</div>
      <div className="interview-count">已完成问话 <b>{asked.length}/4</b></div>
    </section>
    <section className="lock-desk">
      {!solved?<><span className="scene-label">FINAL APPRAISAL</span><h2>输入三位印记</h2><p>答案应能被现有证据完整解释，而不是猜出来。</p>
        <div className="code-lock">{code.map((value,i)=><input key={i} value={value} inputMode="numeric" maxLength="1" aria-label={`第${i+1}位`} onChange={e=>{const next=[...code];next[i]=e.target.value.replace(/\D/g,'');setCode(next)}}/>)}</div>
        <div className="solve-actions"><button className="ornate-button small" onClick={submitCode}>提交鉴定</button><button className="hint-action" onClick={revealHint}>{hintLevel?'再给一点提示':'我卡住了'}</button></div>
        {wrong>0&&<p className="wrong-note">{wrong>=2?'连续两次不对。提示不会扣除克朗。':'顺序不对，重新检查证据。'}</p>}
        {hintLevel>0&&<div className="hint-slip"><small>提示 {hintLevel}/3</small><p>{current.hints[hintLevel-1]}</p></div>}
      </>:<><span className="scene-label">APPRAISAL COMPLETE</span><h2>鉴定成立</h2><p className="conclusion">{current.conclusion}</p>{recorded?<div className="recorded-decision"><small>已记录处置</small><b>{recorded.title}</b><p>{recorded.outcome}</p><button className="ornate-button small" onClick={onContinue}>{current===cases[cases.length-1]?'查看世界线结局':'迎接下一位客人'} →</button></div>:<><h3>现在决定它的去向</h3><div className="decision-grid">{current.decisions.map(d=><button key={d.id} onClick={()=>decide(d)}><b>{d.title}</b><small>{d.caption}</small><span>{d.coins>0?'+':''}{d.coins} ¤ · 声誉 {d.rep>0?'+':''}{d.rep}</span></button>)}</div></>}</>}
    </section>
  </div>
}

function CaseNav({scene,setScene,solved}){
  return <nav className="case-nav"><button className={scene==='counter'?'active':''} onClick={()=>setScene('counter')}><i>♟</i><span>接待</span></button><button className={scene==='inspect'?'active':''} onClick={()=>setScene('inspect')}><i>⌕</i><span>检视</span></button><button className={scene==='question'?'active':''} onClick={()=>setScene('question')}><i>?</i><span>问话</span></button><button className={scene==='solve'?'active':''} onClick={()=>setScene('solve')}><i>{solved?'✓':'◇'}</i><span>鉴定</span></button></nav>
}

function ArchiveScene({game}){
  const owned=new Set([...game.archive,...game.auction])
  return <Room variant="archive" title="地下档案室" eyebrow="ARCHIVE · COLLECTION" description="有些东西被收藏，是因为不能让它们在外面自由活动。每收录一件，最深处的柜门就离你近一步。"><div className="collection-grid">{cases.map(c=><article className={owned.has(c.id)?'':'locked'} key={c.id}><img src={c.objectArt} alt=""/><span>{owned.has(c.id)?c.title:'尚未收录'}</span></article>)}{auctionLots.map(l=><article className={owned.has(l.id)?'lot-card':'lot-card locked'} key={l.id}><img src={l.art} alt=""/><span>{owned.has(l.id)?l.title:'未知拍品'}</span></article>)}</div></Room>
}

function AuctionScene({game,buyLot}){
  return <Room variant="auction" title="乌鸦槌拍卖厅" eyebrow="NIGHT AUCTION" description="出价即成交。拍卖师不接受退货，也不保证拍品只有一位主人。"><div className="auction-room">{auctionLots.map(l=><article key={l.id}><img src={l.art} alt={l.title}/><small>LOT {l.price}</small><h3>{l.title}</h3><p>{l.description}</p><button disabled={game.auction.includes(l.id)||game.coins<l.price} onClick={()=>buyLot(l)}>{game.auction.includes(l.id)?'已经购得':`${l.price} 克朗 · 出价`}</button></article>)}</div></Room>
}

const fateFragments=[
  ['bird','夜莺记住的不是时间，是每一任店主的名字。'],
  ['key','星期八的钥匙来自年老的你；继承早已发生过。'],
  ['jar','十三号不是房子，是会为自己寻找住户的空位。'],
  ['obituary','前任店主与你拥有同样的笔迹，也拥有你的明天。'],
  ['mask','旧剧院的掌声被卖掉后，星期八第一次出现在镇上。'],
  ['watch','所有世界线都在怀表里相遇；最后一次处置决定谁醒来。'],
]

function FateScene({game}){
  const fate=getWorldline(game.decisions)
  const lines=[
    {id:'keeper',name:'守门人线',mark:'门',score:fate.score.keeper,copy:'收进档案、封存异常。你在保护小镇，也在让十三号越来越像你。'},
    {id:'mercy',name:'归还者线',mark:'灯',score:fate.score.mercy,copy:'把奇物还给真正的主人。失去的日期开始回来，但旧伤也会回来。'},
    {id:'broker',name:'乌鸦商人线',mark:'槌',score:fate.score.broker,copy:'让市场替你决定价值。钱能买路，也能买走小镇存在过的证据。'},
  ]
  return <Room variant="fate" title="雨巷命线图" eyebrow="WORLDLINES · CONSEQUENCES" description="每一次处置都在把你推向某一种店主。命线不会提前告诉你代价，只会留下越来越明显的形状。"><div className="fate-grid">{lines.map(line=><article className={fate.dominant===line.id?'dominant':''} key={line.id}><i>{line.mark}</i><small>{line.score} / 6 次倾向</small><h3>{line.name}</h3><p>{line.copy}</p><div><span style={{width:`${Math.min(100,line.score/6*100)}%`}}/></div></article>)}</div><section className="fragment-board"><span>已拼合的真相碎片 · {fate.total}/6</span>{fateFragments.map(([id,text],i)=><p className={game.decisions[id]?'unlocked':'locked'} key={id}><b>{String(i+1).padStart(2,'0')}</b>{game.decisions[id]?text:'这段记忆仍被雨水涂黑。'}</p>)}</section></Room>
}

function LedgerScene({game}){
  return <Room title="事务所营业簿" eyebrow="LEDGER · CONSEQUENCES" description="你做过的决定不会消失，只会换一种方式回来。"><div className="ledger-timeline">{game.ledger.length?game.ledger.slice().reverse().map((r,i)=><article key={i}><em>第 {r.night} 夜</em><div><h3>{r.item} · {r.choice}</h3><p>{r.outcome}</p></div><span>{r.coins>0?'+':''}{r.coins} ¤</span></article>):<p>还没有任何处置记录。</p>}</div></Room>
}

function Room({title,eyebrow,description,children,variant=''}){return <div className={`room-screen ${variant?`room-${variant}`:''}`}><header><span>{eyebrow}</span><h1>{title}</h1><p>{description}</p></header>{children}</div>}

function Outcome({decision,current,onContinue,last}){
  return <div className="outcome-overlay"><div className="outcome-card"><span className="wax-seal">鉴</span><small>第十三号处置记录</small><h2>{decision.title}</h2><b>{current.title}</b><p>{decision.outcome}</p><div><span>{decision.coins>0?'+':''}{decision.coins} 克朗</span><span>声誉 {decision.rep>0?'+':''}{decision.rep}</span></div><button className="ornate-button" onClick={onContinue}>{last?'查看世界线结局':'迎接下一位客人'} →</button></div></div>
}

function Ending({game,onFate}){
  const fate=getWorldline(game.decisions)
  const endings={
    keeper:['第八日守门人','你合上怀表，封住其余支线。十三号从此不再寻找住户——因为它已经学会用你的眼睛守门。'],
    mercy:['把明天还给小镇','星期八在晨光里慢慢融化。失踪者回到各自门前，而前任店主留下的椅子，第一次真正空了。'],
    broker:['永不落槌的夜','你卖掉了星期八，也卖掉小镇存在过的证明。雨巷十三号却在每一位买家的梦里继续营业。'],
    crossroads:['十三号继承人','你没有服从任何一条命线。怀表裂成六枚月牙，前任店主从镜中向你点头——那张脸，正是年老后的你。'],
  }
  const trueEnding=fate.dominant==='crossroads'&&game.reputation>=7
  const key=trueEnding?'crossroads':fate.dominant
  const [title,copy]=endings[key]
  return <div className={`ending-screen ending-${key}`}><div><img src={`${import.meta.env.BASE_URL}assets/rain-alley-logo.webp`} alt=""/><span>第一部终章 · 世界线收束</span><h1>{title}</h1><p>{copy}</p><p>六夜里，你形成了 <b>{fate.score.keeper}</b> 点守门、<b>{fate.score.mercy}</b> 点归还、<b>{fate.score.broker}</b> 点交易倾向；声誉为 <b>{game.reputation}</b>。</p><button className="ornate-button" onClick={onFate}>查看完整命线与真相碎片 →</button></div></div>
}
