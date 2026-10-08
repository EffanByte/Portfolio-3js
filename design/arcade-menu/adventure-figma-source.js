// Native authoring for the uploaded artwork on the Adventure arcade page.
const page=await figma.getNodeByIdAsync('16:186');
await figma.setCurrentPageAsync(page);
if(page.children.some(n=>n.name.startsWith('Adventure menu /')))throw Error('Inspect existing adventure frames before rebuilding.');
await Promise.all(['Regular','Medium','SemiBold','Bold'].map(style=>figma.loadFontAsync({family:'Pixelify Sans',style})));
const existing=new Set(page.query('*').map(n=>n.id));
const artwork={};
for(const [name,id] of [['globe','16:188'],['journal','16:190'],['microphone','16:192'],['telephone','16:194'],['world','16:196']]) {
  artwork[name]=await figma.getNodeByIdAsync(id);
  if(!artwork[name].children[0].fills.some(p=>p.type==='IMAGE'))throw Error('Artwork upload missing: '+name);
}
const controls={left:await figma.getNodeByIdAsync('4:39'),right:await figma.getNodeByIdAsync('4:42'),sparkle:await figma.getNodeByIdAsync('4:45')};
const palette={
  ink:'#334b60',muted:'#526d72',cream:'#fff6dd',gold:'#f5ca65',
  brand:'#2c756d',brandMuted:'#657d81',hud:'#f1fcf3',hudEdge:'#628b91',
  goldEdge:'#ab8243',glint:'#d39334',eyebrow:'#386976',intro:'#3d6972',
  leaf:'#e7f4d8',leafEdge:'#508879',leafShade:'#b5d4ae',
  parchment:'#fff0c8',parchmentEdge:'#ae834f',parchmentShade:'#e4c896',
  lilac:'#eee4fc',lilacEdge:'#8871a6',lilacShade:'#cebee4',
  coral:'#ffe5da',coralEdge:'#b9796a',coralShade:'#e7b8a4',
  selected:'#fff8df',selectedEdge:'#a07b3e',selectedShade:'#ecd39c',
  highlight:'#fffdf1',titleHighlight:'#f2fbdd',number:'#6c8582',caption:'#617474',
  dialogue:'#fffae9',dialogueEdge:'#719695',dialogueText:'#42656a',
  selectedName:'#567b78',counter:'#597778',button:'#e6f1d9',buttonEdge:'#79928a',buttonInk:'#4d776d',
  footer:'#eef9e4',footerInk:'#3d6963',keyEdge:'#8ba99a',white:'#ffffff'
};
const rgb=h=>({r:parseInt(h.slice(1,3),16)/255,g:parseInt(h.slice(3,5),16)/255,b:parseInt(h.slice(5,7),16)/255});
const collection=figma.variables.createVariableCollection('Adventure / Meadow');
collection.renameMode(collection.defaultModeId,'Daylight');
const vars={};
for(const [name,hex] of Object.entries(palette)) {
  const v=figma.variables.createVariable('color/'+name,collection,'COLOR');
  v.scopes=['FRAME_FILL','SHAPE_FILL','TEXT_FILL','STROKE_COLOR','EFFECT_COLOR'];
  v.setValueForMode(collection.defaultModeId,rgb(hex));vars[name]=v;
}
const paint=(name,opacity=1)=>figma.variables.setBoundVariableForPaint({type:'SOLID',color:rgb(palette[name]),opacity},'color',vars[name]);
const styles={};
for(const [name,size,height,weight,tracking] of [
  ['Brand',15,18,'Bold',0],['Header',12,14,'SemiBold',1],['Credit',13,16,'SemiBold',0],
  ['Eyebrow',12,14,'SemiBold',2],['Title',36.6,38.421875,'Bold',0],['Intro',16,19.1875,'Regular',0],
  ['Label',19,19,'SemiBold',0],['Caption',11,13,'Regular',0],['Number',11,13,'Regular',0],
  ['Summary',16,19.1875,'Regular',0],['Selected name',10,12,'SemiBold',1.5],['Footer',12,14,'Regular',0]
]) {
  const s=figma.createTextStyle();s.name='Adventure / '+name;
  s.fontName={family:'Pixelify Sans',style:weight};s.fontSize=size;
  s.lineHeight={unit:'PIXELS',value:height};s.letterSpacing={unit:'PIXELS',value:tracking};styles[name]=s;
}
function layout(name,direction,parent,w,h) {
  const n=figma.createAutoLayout(direction);n.name=name;n.fills=[];n.clipsContent=false;n.counterAxisAlignItems='CENTER';
  if(parent)parent.appendChild(n);
  if(w!==undefined)n.resize(w,h??n.height);
  if(h===undefined)n.primaryAxisSizingMode='AUTO';
  return n;
}
function text(parent,name,copy,style,color='ink',w,h) {
  const n=figma.createText();n.name=name;n.fontName=styles[style].fontName;n.textStyleId=styles[style].id;
  n.characters=copy;n.fills=[paint(color)];parent.appendChild(n);
  if(w!==undefined){n.textAutoResize='NONE';n.resize(w,h??n.height);}
  return n;
}
function outline(n,color,radius=4) {n.strokes=[paint(color)];n.strokeWeight=2;n.strokeAlign='INSIDE';n.strokesIncludedInLayout=false;n.cornerRadius=radius;}
function effect(type,color,y,alpha=1) {return {type,color:{...rgb(palette[color]),a:alpha},offset:{x:0,y},radius:0,spread:0,visible:true,blendMode:'NORMAL'};}
function icon(parent,name,size,color) {
  const n=controls[name].createInstance();parent.appendChild(n);n.name='Control / '+name;n.resize(size,size);
  for(const v of n.findAllWithCriteria({types:['VECTOR']}))v.fills=[paint(color)];return n;
}
function image(parent,name,size) {const n=artwork[name].createInstance();parent.appendChild(n);n.name='Artwork / '+name;n.resize(size,size);return n;}
function gap(parent,h,w) {return layout('Spacing','VERTICAL',parent,w,h);}
const names=['Projects','Experience','About Me','Contact'];
const subjects=['globe','journal','microphone','telephone'];
const captions=['build & explore','the quest so far','meet the player','say hello'];
const descriptions=["Things I've built, one little quest at a time.",'A journal of my adventures so far.','Meet the person behind the pixels.',"Got an idea? Let's make something together."];
const colors=[['leaf','leafEdge','leafShade'],['parchment','parchmentEdge','parchmentShade'],['lilac','lilacEdge','lilacShade'],['coral','coralEdge','coralShade']];
const variants=[];
const cardSets=[];
for(let section=0;section<4;section++) {
  const list=[];
  for(const [state,selected,hover] of [['Default',false,false],['Hover',false,true],['Selected',true,false],['Selected hover',true,true]]) {
    const card=figma.createComponent();card.name='State='+state;card.layoutMode='VERTICAL';card.resize(131.5,168);
    card.paddingTop=21;card.paddingBottom=14;card.paddingLeft=6;card.paddingRight=6;card.primaryAxisAlignItems='CENTER';card.counterAxisAlignItems='CENTER';card.itemSpacing=0;card.clipsContent=false;
    const [fill,edge,shade]=selected?['selected','selectedEdge','selectedShade']:colors[section];
    card.fills=[paint(fill)];outline(card,edge);
    card.effects=[effect('INNER_SHADOW','highlight',3),effect('INNER_SHADOW',shade,-4),effect('DROP_SHADOW',edge,hover?8:5)];
    const pictureSlot=layout('Artwork slot','VERTICAL',card,80,80);
    const picture=image(pictureSlot,subjects[section],80);picture.layoutPositioning='ABSOLUTE';picture.x=0;picture.y=0;
    if(hover){picture.resize(89.6,89.6);picture.x=-4.8;picture.y=-4.8;}
    gap(card,8,119.5);
    const label=text(card,'Label',names[section],'Label');
    gap(card,7,119.5);
    const caption=text(card,'Caption',captions[section],'Caption','caption');
    const number=text(card,'Number',String(section+1).padStart(2,'0'),'Number','number');number.layoutPositioning='ABSOLUTE';number.x=12;number.y=11;
    const glint=icon(card,'sparkle',18,'glint');glint.layoutPositioning='ABSOLUTE';glint.x=102.5;glint.y=8;glint.opacity=selected?1:0;
    const labelKey=card.addComponentProperty('Label','TEXT',names[section]);label.componentPropertyReferences={characters:labelKey};
    const captionKey=card.addComponentProperty('Caption','TEXT',captions[section]);caption.componentPropertyReferences={characters:captionKey};
    card.description='A collectible fantasy menu card with original colorful artwork, warm bevels, and editable text.';
    list.push(card);
  }
  const set=figma.combineAsVariants(list,page);set.name='Adventure / '+names[section]+' card';set.x=200+section*710;set.y=2070;
  set.layoutMode='HORIZONTAL';set.itemSpacing=24;set.paddingLeft=16;set.paddingRight=16;set.paddingTop=16;set.paddingBottom=16;
  set.primaryAxisSizingMode='AUTO';set.counterAxisSizingMode='AUTO';set.fills=[paint('cream')];
  await list[0].setReactionsAsync([{trigger:{type:'ON_HOVER'},actions:[{type:'NODE',destinationId:list[1].id,navigation:'CHANGE_TO',transition:{type:'SMART_ANIMATE',easing:{type:'EASE_OUT'},duration:.18}}]}]);
  await list[2].setReactionsAsync([{trigger:{type:'ON_HOVER'},actions:[{type:'NODE',destinationId:list[3].id,navigation:'CHANGE_TO',transition:{type:'SMART_ANIMATE',easing:{type:'EASE_OUT'},duration:.18}}]}]);
  cardSets.push(set);variants.push(list);
}
const screens=[];
function makeScreen(selected,phase) {
  const root=layout('Adventure menu / '+names[selected]+' / '+(phase?'Drift':'Rest'),'VERTICAL',page,610,530);
  root.x=200+selected*710;root.y=100+phase*580;root.paddingTop=24;root.paddingBottom=24;root.paddingLeft=24;root.paddingRight=24;root.clipsContent=true;
  const background=artwork.world.createInstance();root.appendChild(background);background.layoutPositioning='ABSOLUTE';background.name='Meadow backdrop';background.resize(610,530);background.x=0;background.y=0;root.insertChild(0,background);
  const header=layout('Status bar','HORIZONTAL',root,562,32);header.primaryAxisAlignItems='SPACE_BETWEEN';
  const brand=layout('Identity','HORIZONTAL',header);brand.resize(158,32);brand.primaryAxisAlignItems='CENTER';brand.paddingLeft=12;brand.paddingRight=12;brand.itemSpacing=8;brand.fills=[paint('hud')];outline(brand,'hudEdge',3);brand.effects=[effect('DROP_SHADOW','hudEdge',3)];
  text(brand,'Name','EFFAN','Brand','brand');text(brand,'Portfolio','/ PORTFOLIO','Header','brandMuted');
  const credit=layout('Credit','HORIZONTAL',header);credit.resize(100,32);credit.primaryAxisAlignItems='CENTER';credit.paddingLeft=12;credit.paddingRight=12;credit.itemSpacing=8;credit.fills=[paint('cream')];outline(credit,'goldEdge',3);credit.effects=[effect('DROP_SHADOW','goldEdge',3)];
  icon(credit,'sparkle',16,'glint');text(credit,'Credit count','1 CREDIT','Credit');
  const main=layout('Center stage','VERTICAL',root,562,422);main.layoutGrow=1;main.primaryAxisAlignItems='CENTER';main.paddingTop=phase?16:20;main.paddingBottom=phase?24:20;
  const panel=layout('Adventure menu','VERTICAL',main,562);
  const heading=layout('Panel heading','VERTICAL',panel,562,89.609375);
  const eyebrow=text(heading,'Eyebrow','A LITTLE WORLD BY EFFAN','Eyebrow','eyebrow',562,14);eyebrow.textAlignHorizontal='CENTER';
  gap(heading,8,562);
  const title=text(heading,'Title','Choose your adventure.','Title','ink',562,38.421875);title.textAlignHorizontal='CENTER';title.effects=[effect('DROP_SHADOW','titleHighlight',2)];
  gap(heading,10,562);
  const intro=text(heading,'Introduction','Good stories start with a little curiosity.','Intro','intro',562,19.1875);intro.textAlignHorizontal='CENTER';
  gap(panel,26,562);
  const grid=layout('Four collectible cards','HORIZONTAL',panel,562,168);grid.itemSpacing=12;
  const targets=[];
  for(let i=0;i<4;i++) {
    const slot=layout('Select '+names[i],'VERTICAL',grid,131.5,168);
    const card=variants[i][i===selected?2:0].createInstance();slot.appendChild(card);card.name='Menu item / '+names[i];card.layoutPositioning='ABSOLUTE';card.x=0;card.y=phase?[-3,3,-2,2][i]:0;
    if(phase)card.rotation=i%2?1:-1;
    targets.push(slot);
  }
  gap(panel,22,562);
  const dialogue=layout('Selection dialogue','HORIZONTAL',panel,562,58);dialogue.primaryAxisAlignItems='SPACE_BETWEEN';dialogue.paddingLeft=13;dialogue.paddingRight=13;dialogue.paddingTop=11;dialogue.paddingBottom=11;dialogue.itemSpacing=10;
  dialogue.fills=[paint('dialogue')];outline(dialogue,'dialogueEdge');dialogue.effects=[effect('INNER_SHADOW','white',2),effect('DROP_SHADOW','dialogueEdge',4)];
  const message=layout('Selected section','HORIZONTAL',dialogue);message.itemSpacing=10;
  image(message,subjects[selected],32);
  const copy=layout('Dialogue copy','VERTICAL',message);copy.counterAxisAlignItems='MIN';copy.itemSpacing=3;
  text(copy,'Selected name',names[selected].toUpperCase(),'Selected name','selectedName');
  text(copy,'Description',descriptions[selected],'Summary','dialogueText');
  const steps=layout('Section controls','HORIZONTAL',dialogue);steps.itemSpacing=6;
  function step(name,control) {const b=layout(name,'HORIZONTAL',steps,28,28);b.primaryAxisAlignItems='CENTER';b.fills=[paint('button')];outline(b,'buttonEdge',2);b.effects=[effect('DROP_SHADOW','buttonEdge',2)];icon(b,control,20,'buttonInk');return b;}
  const previous=step('Previous section','left');
  const position=text(steps,'Section position',String(selected+1).padStart(2,'0')+' / 04','Footer','counter',42,14);position.textAlignHorizontal='CENTER';
  const next=step('Next section','right');
  const footer=layout('Keyboard hints','HORIZONTAL',root);footer.resize(248.3125,28);footer.paddingLeft=11;footer.paddingRight=11;footer.paddingTop=5;footer.paddingBottom=5;footer.itemSpacing=20;footer.cornerRadius=3;footer.fills=[paint('footer',.9)];
  const arrows=layout('Explore hint','HORIZONTAL',footer);arrows.itemSpacing=3;icon(arrows,'left',18,'footerInk');icon(arrows,'right',18,'footerInk');text(arrows,'Explore copy','to explore','Footer','footerInk');
  const enter=layout('Enter hint','HORIZONTAL',footer);enter.itemSpacing=4;
  const key=layout('Enter key','HORIZONTAL',enter);key.paddingLeft=5;key.paddingRight=5;key.paddingTop=1;key.paddingBottom=1;key.fills=[paint('selected')];key.strokes=[paint('keyEdge')];key.strokeWeight=1;key.strokesIncludedInLayout=false;
  text(key,'Key label','Enter','Footer','footerInk');text(enter,'Select copy','to select','Footer','footerInk');
  return {root,panel,targets,previous,next};
}
for(let selected=0;selected<4;selected++)screens.push([makeScreen(selected,0),makeScreen(selected,1)]);
for(let selected=0;selected<4;selected++)for(let phase=0;phase<2;phase++) {
  const screen=screens[selected][phase];
  await screen.root.setReactionsAsync([{trigger:{type:'AFTER_TIMEOUT',timeout:.001},actions:[{type:'NODE',destinationId:screens[selected][1-phase].root.id,navigation:'NAVIGATE',transition:{type:'SMART_ANIMATE',easing:{type:'EASE_IN_AND_OUT'},duration:2}}]}]);
  for(let i=0;i<4;i++)if(i!==selected)await screen.targets[i].setReactionsAsync([{trigger:{type:'ON_CLICK'},actions:[{type:'NODE',destinationId:screens[i][phase].root.id,navigation:'NAVIGATE',transition:{type:'SMART_ANIMATE',easing:{type:'EASE_OUT'},duration:.18}}]}]);
  for(const [button,destination] of [[screen.previous,(selected+3)%4],[screen.next,(selected+1)%4]])await button.setReactionsAsync([{trigger:{type:'ON_CLICK'},actions:[{type:'NODE',destinationId:screens[destination][phase].root.id,navigation:'NAVIGATE',transition:{type:'SMART_ANIMATE',easing:{type:'EASE_OUT'},duration:.18}}]}]);
}
page.flowStartingPoints=[{nodeId:screens[0][0].root.id,name:'A little adventure'}];
const nodes=page.query('*').toArray();const counts={};for(const n of nodes)counts[n.type]=(counts[n.type]||0)+1;
return {createdNodeIds:nodes.filter(n=>!existing.has(n.id)).map(n=>n.id),mutatedNodeIds:[page.id],collectionId:collection.id,variableIds:Object.values(vars).map(v=>v.id),styleIds:Object.values(styles).map(s=>s.id),primaryFrameId:screens[0][0].root.id,pageId:page.id,cardSetIds:cardSets.map(n=>n.id),screens:screens.map(pair=>pair.map(s=>({id:s.root.id,name:s.root.name,width:s.root.width,height:s.root.height,panel:s.panel.absoluteBoundingBox}))),counts,artworkHashes:Object.fromEntries(Object.entries(artwork).map(([name,master])=>[name,master.children[0].fills[0].imageHash])),fontFamilies:[...new Set(page.findAllWithCriteria({types:['TEXT']}).map(n=>n.fontName.family))]};
