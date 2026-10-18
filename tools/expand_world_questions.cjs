// Idempotent bilingual authoring source. Existing issued questions are stored as
// server snapshots, so revising an ID never changes an already active question.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..'),file=path.join(root,'data/questions.json');
const bank=JSON.parse(fs.readFileSync(file,'utf8')),byId=new Map(bank.map(q=>[q.id,q]));
const hints=JSON.parse(fs.readFileSync(path.join(root,'data/question_hints.json'),'utf8'));
const tiers={EASY:[10,5,1],MEDIUM:[15,8,2],HARD:[20,10,3]};
// Content determines the learning category independently of the difficulty tier.
const statementSkills={
  'maple-tf-022':'grammar','maple-tf-023':'grammar','maple-tf-024':'grammar',
  'maple-tf-025':'grammar','maple-tf-030':'grammar','forest-tf-016':'vocabulary'
};
const contexts={
  maple:['Picture a conversation at home or in the village shop. Check the key word and subject.','想象家中或村庄商店里的对话，检查关键词和主语。'],
  forest:['Picture the trail and its signs. Check direction, time words and the verb form.','想象森林小路和路牌，检查方向、时间词和动词形式。'],
  camp:['Separate the travel plan into who, action and time. Check conditions and verb tense.','把旅行计划分成谁、行动和时间，检查条件和时态。'],
  ruins:['Read conditions and results separately. Notice words such as unless, only, before and not.','分别理解条件和结果，注意 unless、only、before 和 not 等词。']
};
function put(realm,id,difficulty,data){const [xp,coins,englishPower]=tiers[difficulty];byId.set(id,{id,realm,...data,difficulty,timeLimit:difficulty==='HARD'?(data.type==='SENTENCE_BUILDER'?24:16):difficulty==='MEDIUM'?(data.type==='SENTENCE_BUILDER'?18:14):(data.type==='TRUE_FALSE'?8:12),xp,coins,englishPower});}
function statements(realm,rows,start=11){rows.forEach((r,i)=>{const [question,questionZh,answer,explanation,explanationZh]=r,id=`${realm}-tf-${String(start+i).padStart(3,'0')}`,difficulty=realm==='maple'?'EASY':realm==='forest'?(i<5?'EASY':'MEDIUM'):realm==='camp'?(i<5?'MEDIUM':'HARD'):'HARD';
  put(realm,id,difficulty,{type:'TRUE_FALSE',skill:statementSkills[id]??(realm==='ruins'?'itEnglish':realm==='camp'||(realm==='forest'&&i>=5)?'grammar':'vocabulary'),question,questionZh,answer,explanation,explanationZh});const [en,zh]=contexts[realm];hints[id]={en,zh};});}
function odds(realm,rows){rows.forEach((r,i)=>{const [group,answer,category,categoryZh]=r,words=group.split('|').concat(answer);assert.equal(new Set(words).size,4);
  put(realm,`${realm}-odd-${String(i+11).padStart(3,'0')}`,realm==='forest'&&i>=5?'MEDIUM':'EASY',{type:'ODD_WORD_OUT',skill:'vocabulary',question:'Which word does not belong?',questionZh:'哪一个单词不属于同一类？',words,answer,prompt:`Three words name ${category}.`,promptZh:`其中三个词属于“${categoryZh}”。`,explanation:`${group.split('|').join(', ')} name ${category}; ${answer} does not belong to that group.`,explanationZh:`${group.split('|').join('、')} 属于“${categoryZh}”，${answer} 不属于这一类。`});});}
function sentences(realm,rows,start=11){rows.forEach((r,i)=>{const [sentence,meaning,explanation,explanationZh]=r,words=sentence.split(' '),prefix=words.slice(0,2).join(' ');assert.equal(new Set(words).size,words.length, sentence);
  put(realm,`${realm}-sentence-${String(start+i).padStart(3,'0')}`,realm==='camp'&&i<5?'MEDIUM':'HARD',{type:'SENTENCE_BUILDER',skill:realm==='ruins'?'itEnglish':'sentenceConstruction',question:'Build the correct sentence.',questionZh:'把单词排列成正确的句子。',words,answerOrder:[...words],prompt:`Start with "${prefix}". Use every word once; keep the stated meaning.`,promptZh:`意思是“${meaning}”。以 ${prefix} 开头，每个词用一次。`,explanation,explanationZh});});}

statements('maple',[
 ['Breakfast is usually the first meal of the day.','早餐通常是一天中的第一餐。',true,'Breakfast is the morning meal after waking up.','Breakfast 指起床后的早餐。'],
 ['A thirsty traveler needs sleep rather than a drink.','口渴的旅人需要睡觉，而不是喝水。',false,'Thirsty means needing something to drink; tired means needing rest.','Thirsty 表示口渴；tired 才表示疲倦、需要休息。'],
 ['If you borrow a book, you are expected to return it.','如果你借一本书，通常需要归还。',true,'Borrow means use something temporarily and return it later.','Borrow 表示暂时借用，之后要归还。'],
 ['Please be quiet asks someone to make more noise.','Please be quiet 是叫别人发出更多噪音。',false,'Quiet means making little or no noise.','Quiet 表示安静，不是制造更多声音。'],
 ['The box beneath the table is under the table.','桌子 beneath 的箱子就是在桌子下面。',true,'Beneath and under both describe a lower position.','Beneath 和 under 都可以表示在……下面。'],
 ['An empty basket is already full of apples.','一个 empty 的篮子已经装满苹果。',false,'Empty means containing nothing; full means holding as much as possible.','Empty 是空的；full 才是满的。'],
 ['To sell bread is to give it to someone in exchange for payment.','Sell bread 是把面包卖给别人并收取费用。',true,'Sell means exchange goods for money.','Sell 表示出售，用商品换取金钱。'],
 ['Yesterday names the day after today.','Yesterday 指今天之后的那一天。',false,'Yesterday is the day before today; tomorrow is the day after.','Yesterday 是昨天；tomorrow 才是明天。'],
 ['A shop receipt can show what a customer paid for.','商店的收据可以显示顾客付费购买了什么。',true,'A receipt records a payment or purchase.','Receipt 指记录付款或购物情况的收据。'],
 ['Your sibling is always your school teacher.','你的 sibling 一定是你的学校老师。',false,'A sibling is a brother or sister.','Sibling 表示兄弟或姐妹。'],
 ['A closed shop is not open to customers at that time.','一家 closed 的商店在那个时候不营业。',true,'Closed is the opposite of open.','Closed 与 open 的意思相反。'],
 ['There is three apples is standard English grammar.','There is three apples 符合标准英语语法。',false,'Use there are with the plural noun apples.','Apples 是复数，应使用 there are。'],
 ['She has a bag uses the correct verb for a singular subject.','She has a bag 使用了适合单数主语的动词。',true,'He, she and it take has in the present simple.','一般现在时中，he、she、it 搭配 has。'],
 ['I need go home is a complete standard sentence.','I need go home 是完整、标准的句子。',false,'Say I need to go home: need is followed by to plus a verb here.','应说 I need to go home，此处 need 后接 to 加动词。'],
 ['Children is the plural form of child.','Children 是 child 的复数形式。',true,'Child has the irregular plural children.','Child 的不规则复数是 children。'],
 ['A cheap item usually costs a very large amount of money.','Cheap 的物品通常需要花很多钱。',false,'Cheap means low in price; expensive means costly.','Cheap 表示便宜；expensive 才表示昂贵。'],
 ['How much is this asks about the price of an item.','How much is this 是在询问物品的价格。',true,'How much can ask the price when buying something.','购物时，how much 可以用来询问价格。'],
 ['Between describes a position beside only one object.','Between 表示只在一个物体的旁边。',false,'Between normally describes a position separating two things in this basic usage.','在这个基础用法中，between 表示在两个事物之间。'],
 ['Adding please can make a request more polite.','在请求中加 please 可以更有礼貌。',true,'Please is commonly used in polite requests.','Please 常用于礼貌的请求。'],
 ['He do not like milk is standard present-simple grammar.','He do not like milk 符合标准的一般现在时语法。',false,'Use he does not like milk with the singular subject he.','单数主语 he 应搭配 does not。']
]);
odds('maple',[
 ['breakfast|lunch|dinner','window','meals','餐食'],['jacket|scarf|gloves','plate','clothing','衣物'],['aunt|uncle|cousin','ladder','family members','家庭成员'],['kitchen|bedroom|bathroom','Monday','rooms','房间'],
 ['Monday|Friday|Sunday','pillow','days of the week','星期'],['carrot|onion|potato','blanket','vegetables','蔬菜'],['spoon|fork|knife','cloud','eating utensils','餐具'],['cup|bottle|jug','socks','drink containers','饮料容器'],
 ['pencil|eraser|ruler','cheese','stationery','文具'],['doctor|baker|farmer','purple','occupations','职业'],['happy|sad|angry','shelf','feelings','感受'],['morning|afternoon|evening','wallet','times of day','一天中的时段'],
 ['circle|square|triangle','cabbage','shapes','形状'],['red|yellow|purple','uncle','colors','颜色'],['milk|juice|water','jacket','drinks','饮品'],['apple|peach|grape','chair','fruit','水果'],
 ['bus|bicycle|taxi','carpet','vehicles','交通工具'],['pound|dollar|euro','pancake','currencies','货币'],['wash|cook|clean','pillow','household actions','家务动作'],['market|bakery|bookshop','sleepy','places to shop','购物场所']
]);
statements('forest',[
 ['Moss often grows in damp, shaded places.','苔藓常生长在潮湿、遮阴的地方。',true,'Damp means slightly wet; shaded means protected from direct sunlight.','Damp 表示微湿；shaded 表示有遮阴。'],
 ['Walking upstream means following a river toward its mouth.','Walking upstream 表示沿河流走向河口。',false,'Upstream goes toward the source; downstream follows the flow.','Upstream 是向上游、源头方向；downstream 是顺流而下。'],
 ['Camouflage helps an animal blend into its surroundings.','Camouflage 可以帮助动物融入周围环境。',true,'Camouflage makes an animal harder to notice against its background.','Camouflage 表示保护色或伪装，让动物不易被发现。'],
 ['An owl is a mammal because it can fly.','猫头鹰因为会飞，所以属于哺乳动物。',false,'An owl is a bird; mammal and bird are different animal groups.','猫头鹰是鸟类，mammal 和 bird 是不同类别。'],
 ['Roots can take in water from soil.','植物的根可以从土壤中吸收水分。',true,'Roots are the underground parts that absorb water.','Roots 是植物的根，可以吸收水分。'],
 ['Some birds migrate to another region when the seasons change.','有些鸟在季节变化时会迁徙到其他地区。',true,'Migrate means move between regions, often seasonally.','Migrate 表示迁徙，常与季节变化有关。'],
 ['This valley is more colder uses a correct comparative form.','This valley is more colder 使用了正确的比较级。',false,'Use colder, not more colder: do not mark this comparative twice.','应使用 colder，不应同时使用 more 和 -er。'],
 ['Leaves fell yesterday uses the past tense of fall.','Leaves fell yesterday 使用了 fall 的过去式。',true,'Fell is the irregular past tense of fall.','Fell 是 fall 的不规则过去式。'],
 ['We was near the stream has correct subject-verb agreement.','We was near the stream 的主谓搭配正确。',false,'Use we were, not we was.','We 应搭配 were，不是 was。'],
 ['Birds are building nests describes an activity in progress.','Birds are building nests 描述正在进行的活动。',true,'Are plus building forms the present continuous.','Are 加 building 构成现在进行时。'],
 ['If it will rain, we will wait is the usual first-conditional pattern.','If it will rain, we will wait 是通常的一类条件句结构。',false,'For this prediction use if it rains, we will wait.','此处应使用 if it rains, we will wait，if 从句用一般现在时。'],
 ['The path which leads north contains a relative clause describing the path.','The path which leads north 包含修饰 path 的关系从句。',true,'Which leads north gives more information about the path.','Which leads north 提供有关小路的额外信息。'],
 ['Fewer water is the usual expression for a smaller amount of water.','Fewer water 是表示较少水量的通常说法。',false,'Water is uncountable here, so use less water.','此处 water 不可数，应使用 less water。'],
 ['A narrower bridge has less width than a wider bridge.','Narrower 的桥比 wider 的桥宽度更小。',true,'Narrower is the comparative form of narrow.','Narrower 是 narrow 的比较级，表示更窄。'],
 ['Although always introduces the cause of an event.','Although 总是引出事件的原因。',false,'Although introduces contrast or concession, not a cause.','Although 表示虽然、尽管，引出让步，而不是原因。'],
 ['You must not leave the trail expresses a prohibition.','You must not leave the trail 表示禁止离开小路。',true,'Must not means something is not allowed.','Must not 表示禁止做某事。'],
 ['Unless means exactly the same as if in every condition.','Unless 在所有条件句中都与 if 完全相同。',false,'Unless usually means if not.','Unless 通常表示 if not，即除非、如果不。'],
 ['The fox had left before we arrived puts the fox leaving first.','The fox had left before we arrived 表示狐狸先离开。',true,'Had left is past perfect and describes the earlier past action.','Had left 是过去完成时，表示更早发生的动作。'],
 ['Whose in whose footprints asks only about location.','Whose footprints 中的 whose 只询问位置。',false,'Whose asks about possession: who the footprints belong to.','Whose 询问归属，即这些脚印是谁留下的。'],
 ['The plants needs sunlight has correct subject-verb agreement.','The plants needs sunlight 的主谓搭配正确。',false,'Plural plants takes need, not needs.','复数主语 plants 应搭配 need，不是 needs。']
]);
odds('forest',[
 ['pawprint|hoofprint|footprint','lantern','tracks','足迹'],['stream|river|brook','helmet','flowing water features','流动水体'],['trunk|branch|root','compass','parts of trees','树的部位'],['beetle|ant|butterfly','salmon','insects','昆虫'],['mist|rain|snow','backpack','weather conditions','天气现象'],
 ['upstream|downstream|eastward','shelter','directions of movement','移动方向'],['migrate|hibernate|camouflage','calculate','animal survival behaviors','动物生存行为'],['damp|humid|moist','arid','words describing wet conditions','描述潮湿的词'],
 ['predator|prey|habitat','invoice','ecology terms','生态相关词'],['oak|birch|willow','granite','types of trees','树的种类'],['bud|petal|pollen','claw','flower-related parts','花的相关部分'],['talon|beak|feather','gill','bird body features','鸟的身体特征'],
 ['murmur|whisper|rustle','thunder','relatively quiet sounds','相对轻微的声音'],['decay|decompose|rot','bloom','breaking-down processes','腐解过程'],['meadow|glade|clearing','tunnel','open areas among vegetation','植被中的开阔地'],
 ['nocturnal|diurnal|crepuscular','circular','animal activity-time descriptions','动物活动时段的描述'],['sprout|germinate|blossom','evaporate','plant growth actions','植物生长动作'],['carnivore|herbivore|omnivore','reservoir','animal diet groups','动物食性类别'],
 ['tributary|waterfall|rapids','constellation','river features','河流地貌'],['erosion|sediment|riverbank','password','land-and-water terms','水土相关词']
]);
statements('camp',[
 ['We packed our bags yesterday describes a completed past action.','We packed our bags yesterday 描述已完成的过去动作。',true,'Yesterday places the packing in the past.','Yesterday 表示昨天，因此 packed 使用过去式。'],
 ['She have enough rope has correct subject-verb agreement.','She have enough rope 的主谓搭配正确。',false,'Use she has, not she have.','She 应搭配 has，不是 have。'],
 ['Turn left at the camp tells a traveler where to change direction.','Turn left at the camp 告诉旅人在哪里改变方向。',true,'Turn left means change direction toward the left.','Turn left 表示向左转。'],
 ['Before we leave, check the map tells us to check after leaving.','Before we leave, check the map 表示离开后才查看地图。',false,'Before means the check happens earlier than departure.','Before 表示查看地图要发生在离开之前。'],
 ['Enough food means the amount is sufficient for the stated need.','Enough food 表示食物数量足以满足所说的需要。',true,'Enough means sufficient, rather than unlimited.','Enough 表示足够，不是无限多。'],
 ['The supplies were delivered uses a passive verb form.','The supplies were delivered 使用了被动语态。',true,'Were plus delivered shows that the supplies received the action.','Were 加 delivered 表示物资是被运送的对象。'],
 ['We have arrived yesterday is standard usage with that finished past time.','We have arrived yesterday 符合该明确过去时间下的标准用法。',false,'Use we arrived yesterday; finished past time normally takes simple past.','应使用 we arrived yesterday，明确结束的过去时间通常搭配一般过去时。'],
 ['If we had more rope, we would cross describes an imagined present condition.','If we had more rope, we would cross 描述假设的现在条件。',true,'If plus past simple and would plus a verb form a second conditional.','If 加过去式、主句用 would 加动词，可构成第二类条件句。'],
 ['Can you tell me where is the camp uses standard indirect-question order.','Can you tell me where is the camp 使用了标准间接问句语序。',false,'Use where the camp is after can you tell me.','在 can you tell me 后，应使用 where the camp is 的陈述语序。'],
 ['Although supplies were limited, everyone shared expresses a contrast.','Although supplies were limited, everyone shared 表达让步对比。',true,'Although contrasts limited supplies with willingness to share.','Although 把物资有限与大家愿意分享形成让步对比。'],
 ['Neither of the two routes are safe is the formal singular-agreement pattern.','Neither of the two routes are safe 使用了正式的单数一致形式。',false,'In formal singular agreement, use neither of the routes is safe.','在正式的单数一致结构中，neither of 后应使用 is。'],
 ['We have waited since dawn connects a past start with the present.','We have waited since dawn 把过去开始的等待与现在联系起来。',true,'Since gives the starting point for an action continuing to now.','Since 表示开始时间，可与现在完成时搭配。'],
 ['He said that he is ready always shows the usual past-tense backshift.','He said that he is ready 总是体现通常的过去时态后移。',false,'Usual backshift after said is he was ready, though unchanged tense can fit special contexts.','Said 后通常后移为 he was ready；特定语境可以不后移，但原句不体现这种后移。'],
 ['The scout who repaired our tent uses who to describe a person.','The scout who repaired our tent 用 who 修饰一个人。',true,'Who introduces a relative clause about the scout.','Who 引出修饰侦察员 scout 的关系从句。'],
 ['Unless the storm ends means if the storm ends.','Unless the storm ends 的意思是如果风暴结束。',false,'Unless the storm ends means if the storm does not end.','Unless 在这里相当于 if not，即如果风暴不结束。'],
 ['The least dangerous route is the one with the lowest danger in a comparison.','The least dangerous route 指比较中危险程度最低的路线。',true,'Least plus an adjective expresses the lowest degree.','Least 加形容词表示程度最低。'],
 ['We avoid to travel at night uses the usual verb pattern after avoid.','We avoid to travel at night 使用了 avoid 后通常的动词结构。',false,'Avoid is followed by a noun or an -ing form: avoid traveling.','Avoid 后通常接名词或 -ing 形式，应为 avoid traveling。'],
 ['We should have checked the rope can express regret about a past omission.','We should have checked the rope 可以表达对过去疏漏的遗憾。',true,'Should have plus a past participle can describe a past action that was advisable.','Should have 加过去分词可表示过去本应该做的事。'],
 ['Despite we were tired, we continued uses a standard despite clause.','Despite we were tired, we continued 使用了标准的 despite 从句。',false,'Use despite being tired or although we were tired.','应使用 despite being tired 或 although we were tired。'],
 ['In careful formal English, less backpacks is preferred to fewer backpacks.','在严谨的正式英语中，less backpacks 优于 fewer backpacks。',false,'Use fewer with a plural countable noun such as backpacks.','Backpacks 是可数名词复数，正式表达中应使用 fewer。']
]);
sentences('camp',[
 ['The scout checked our tents before sunrise','侦察员在日出前检查了我们的帐篷','Use past-simple checked with the completed action; before sunrise is the time phrase.','完成的过去动作使用 checked；before sunrise 表示时间。'],
 ['We should carry enough water for everyone','我们应该为每个人带足够的水','Should is followed by carry, the base verb.','Should 后接动词原形 carry。'],
 ['Our guide showed them a safer route','我们的向导给他们展示了一条更安全的路线','Showed takes a person and the thing shown; safer compares routes.','Showed 后可接接受者和展示的事物；safer 是比较级。'],
 ['The travelers were resting beside their campfire','旅人们当时正在营火旁休息','Were plus resting forms the past continuous.','Were 加 resting 构成过去进行时。'],
 ['You must check this bridge before crossing','你必须在过桥前检查这座桥','Must takes check; before can be followed by crossing.','Must 后接 check；before 后可以接 crossing。'],
 ['If rain returns, our team will postpone departure','如果再次下雨，我们的队伍就会推迟出发','In this first conditional use present returns after if, then will postpone.','一类条件句中 if 后用 returns，主句用 will postpone。'],
 ['The supplies were carried across a narrow bridge','物资被搬过了一座狭窄的桥','Were carried is passive; across describes movement to the other side.','Were carried 是被动语态；across 表示从一边到另一边。'],
 ['Although everyone felt exhausted, we continued toward shelter','虽然每个人都筋疲力尽，我们仍继续前往避难处','Although introduces contrast; the main clause follows it.','Although 引出让步从句，之后接主句。'],
 ['We had secured our equipment before darkness fell','天黑之前，我们已经固定好了装备','Had secured is the earlier past action; fell happens later.','Had secured 表示更早的过去动作，fell 发生在其后。'],
 ['Unless conditions improve, the expedition must remain here','除非条件改善，否则探险队必须留在这里','Unless means if not; must is followed by remain.','Unless 相当于 if not；must 后接 remain。'],
 ['Our leader asked whether anyone needed additional blankets','领队询问是否有人需要额外的毯子','Asked introduces an indirect question with subject before needed.','Asked 后的间接问句使用主语在 needed 前的陈述语序。'],
 ['The route that avoids cliffs is considerably safer','避开悬崖的那条路线安全得多','That avoids cliffs describes route; considerably modifies the comparative safer.','That avoids cliffs 修饰 route；considerably 修饰比较级 safer。'],
 ['You should have inspected those knots before climbing','你本应该在攀爬前检查那些绳结','Should have inspected refers to an advisable earlier action.','Should have inspected 表示过去本应该进行的检查。'],
 ['Despite heavy rain, our companions reached shelter safely','尽管下着大雨，同伴们还是安全抵达了避难处','Despite is followed by the noun phrase heavy rain.','Despite 后接名词短语 heavy rain，而不是直接接完整从句。'],
 ['If we had known earlier, help would have arrived','如果我们早些知道，援助本来就会到达','Had known and would have arrived form a third conditional.','Had known 与 would have arrived 构成第三类条件句。'],
 ['The injured traveler was given a warm blanket','受伤的旅人得到了一条温暖的毯子','Was given is passive; traveler receives the blanket.','Was given 是被动语态，traveler 是毯子的接受者。'],
 ['Neither of these paths leads directly toward camp','这两条路都不能直接通向营地','Neither takes the singular verb leads in this formal pattern.','在这个正式结构中，neither 搭配单数动词 leads。'],
 ['We will leave once every member has returned','每位成员都回来之后，我们就会出发','Once introduces a time clause; use has returned, not will return, here.','Once 引出时间从句，此处使用 has returned，而不是 will return。'],
 ['Our supplies are sufficient provided that nobody wastes food','只要没有人浪费食物，我们的补给就是足够的','Provided that introduces a condition meaning if.','Provided that 引出条件，意思是只要、如果。'],
 ['The map indicates where exhausted travelers can rest','地图标明了疲惫的旅人可以在哪里休息','The embedded question uses travelers can rest rather than can travelers rest.','嵌入式疑问结构使用 travelers can rest 的陈述语序。']
]);

// Upgrade the original ruins IDs as well as adding twenty of each type. Real
// conditions, passive forms and multi-clause sentences make HARD substantive.
statements('ruins',[
 ['If a report was saved before shutdown, saving happened earlier than shutdown.','如果报告在关机前已经保存，保存就发生在关机之前。',true,'Before places saving earlier; was saved is a passive form.','Before 表示保存更早发生；was saved 是被动语态。'],
 ['The instruction never disclose your password allows sharing it with strangers.','Never disclose your password 允许把密码分享给陌生人。',false,'Never disclose prohibits revealing the password.','Never disclose 表示绝对不要泄露密码。'],
 ['The notice upload complete indicates that sending the file has finished.','Upload complete 这个通知表示发送文件的操作已经结束。',true,'Complete marks a finished action; upload sends a file to another system.','Complete 表示完成；upload 指向另一个系统上传文件。'],
 ['The file was downloaded says that the server copy was necessarily deleted.','The file was downloaded 表示服务器上的副本必然被删除。',false,'Downloaded describes receiving a copy, not necessarily deleting the source.','Downloaded 表示接收到副本，不表示源文件必然被删除。'],
 ['A backup that was created before corruption may preserve an earlier version.','在数据损坏之前建立的备份，可能保留更早的版本。',true,'Before establishes order; may expresses possibility rather than certainty.','Before 表示先后顺序；may 表示可能，而非必然。'],
 ['The label read-only grants unrestricted permission to modify the file.','Read-only 标签授予了无限制修改文件的权限。',false,'Read-only permits reading; unrestricted editing is not its meaning.','Read-only 表示只读，不表示可以无限制编辑。'],
 ['Although cached pages may open offline, a new network request still needs a connection.','虽然缓存页面可能离线打开，新的网络请求仍然需要连接。',true,'Although introduces contrast between cached content and a new request.','Although 对比已缓存内容和新网络请求。'],
 ['Access denied confirms that permission has been granted.','Access denied 确认权限已经获批。',false,'Denied means refused, while granted means allowed.','Denied 表示被拒绝；granted 才表示被授予。'],
 ['The message ready after verification means readiness follows verification.','Ready after verification 表示准备就绪发生在验证之后。',true,'After places readiness later than verification.','After 表示准备就绪在验证之后。'],
 ['Knowing a username necessarily means knowing the account password.','知道用户名就必然表示知道账号密码。',false,'A username identifies an account; it is not the same information as its password.','用户名用于识别账号，并不是密码本身。'],
 ['Unless permission is granted, entry is blocked means entry stays blocked without permission.','Unless permission is granted, entry is blocked 表示没有许可时仍被禁止进入。',true,'Unless means if not: if permission is not granted, entry is blocked.','Unless 相当于 if not：如果许可未获批，就禁止进入。'],
 ['Do not disconnect until verification ends allows disconnecting before verification finishes.','Do not disconnect until verification ends 允许在验证结束前断开连接。',false,'Not until requires waiting for the stated event.','Not until 表示必须等到指定事件发生之后。'],
 ['The records have been updated uses the present-perfect passive.','The records have been updated 使用现在完成时的被动语态。',true,'Have been plus updated combines perfect aspect with passive voice.','Have been 加 updated 结合了完成时和被动语态。'],
 ['In the file was restored by Mira, the file performed the restoration.','在 the file was restored by Mira 中，是文件执行了恢复操作。',false,'The file receives the action; Mira is the agent after by.','文件是动作接受者，by 后的 Mira 才是执行者。'],
 ['By the time access resumed, backups had finished puts backup completion first.','By the time access resumed, backups had finished 表示备份先完成。',true,'Past perfect had finished marks the earlier past event.','Had finished 是过去完成时，表示更早发生的事件。'],
 ['The warning may have failed states with certainty that a failure occurred.','The warning may have failed 肯定地说明故障已经发生。',false,'May have expresses possibility, not certainty.','May have 表示可能发生过，而非确定。'],
 ['A device which supports this format contains a clause describing the device.','A device which supports this format 含有修饰设备的关系从句。',true,'Which supports this format gives information about device.','Which supports this format 提供有关 device 的信息。'],
 ['Not all requests failed means that every request failed.','Not all requests failed 的意思是每个请求都失败了。',false,'Not all denies that every request failed; at least one did not.','Not all 否定全部失败，表示至少有一个没有失败。'],
 ['Compatible in a compatible format means suitable for use with the stated system.','A compatible format 中的 compatible 表示适合与所说系统一起使用。',true,'Compatible describes things that can work together in the stated context.','Compatible 表示在所述语境中可以相互兼容、协同使用。'],
 ['Temporary access means access that is guaranteed to last forever.','Temporary access 表示保证永久有效的访问权限。',false,'Temporary means for a limited time; permanent means lasting.','Temporary 表示临时；permanent 才表示长期或永久。'],
 ['Obsolete software is described as outdated rather than newly introduced.','Obsolete software 指过时的软件，而不是刚推出的软件。',true,'Obsolete means no longer current or in common use.','Obsolete 表示过时或已不再通用。'],
 ['Retrieve a record means permanently destroy that record.','Retrieve a record 的意思是永久销毁那条记录。',false,'Retrieve means find and obtain something stored.','Retrieve 表示查找并取回已保存的内容。'],
 ['The requests are being processed describes an ongoing passive action.','The requests are being processed 描述正在进行的被动动作。',true,'Are being plus processed forms the present-continuous passive.','Are being 加 processed 构成现在进行时的被动语态。'],
 ['Neither server responded says that both servers responded successfully.','Neither server responded 表示两台服务器都成功回应。',false,'Neither means not one and not the other in the two-server comparison.','在两台服务器的比较中，neither 表示两者都没有。'],
 ['Only if verification succeeds can access resume makes successful verification necessary.','Only if verification succeeds can access resume 表示验证成功是恢复访问的必要条件。',true,'Only if introduces a necessary condition.','Only if 引出必要条件。'],
 ['Although the connection was slow, the transfer finished says slowness prevented completion.','Although the connection was slow, the transfer finished 表示速度慢导致传输未完成。',false,'Although contrasts slowness with the fact that the transfer still finished.','Although 表示虽然连接慢，但传输仍然完成了。'],
 ['The data had been encrypted before storage describes encryption occurring first.','The data had been encrypted before storage 表示加密先发生。',true,'Had been encrypted is past-perfect passive; before establishes the order.','Had been encrypted 是过去完成时被动语态；before 表示先后。'],
 ['You need not restart means that restarting is forbidden.','You need not restart 表示禁止重新启动。',false,'Need not means not necessary; must not means forbidden.','Need not 表示不必；must not 才表示禁止。'],
 ['Access resumes provided that the token remains valid states a condition for resuming access.','Access resumes provided that the token remains valid 说明恢复访问的条件。',true,'Provided that means on condition that.','Provided that 表示条件是、只要。'],
 ['Despite the server was busy is a standard clause after despite.','Despite the server was busy 是 despite 后的标准从句形式。',false,'Use despite the busy server or although the server was busy.','应说 despite the busy server，或 although the server was busy。']
],1);
sentences('ruins',[
 ['The system will reject your password unless access is authorized','除非访问获准，否则系统会拒绝你的密码','Unless introduces an exception; will reject belongs to the main clause.','Unless 引出例外条件；will reject 属于主句。'],
 ['A backup can restore our data after storage has failed','存储发生故障后，备份可以恢复我们的数据','After introduces the later context; has failed is present perfect.','After 引出存储故障之后的情境；has failed 是现在完成时。'],
 ['We cannot open this file until permission has been granted','权限获批之前，我们不能打开这个文件','Cannot plus until requires waiting; has been granted is perfect passive.','Cannot 加 until 表示必须等待；has been granted 是完成时被动语态。'],
 ['The database retains our records even when connections become unavailable','即使连接不可用，数据库仍保留我们的记录','Even when adds a contrasting condition to the main statement.','Even when 给主句添加带让步意味的条件。'],
 ['This key unlocks only gates that have already been registered','这把钥匙只解锁已经登记的大门','That have already been registered is a relative clause in perfect passive form.','That have already been registered 是完成时被动形式的关系从句。'],
 ['The server will deliver a message once verification has succeeded','验证成功之后，服务器就会发送一条消息','Once introduces a time condition; has succeeded precedes delivery.','Once 引出时间条件；has succeeded 先于消息发送。'],
 ['You must enter your username before authentication can begin','你必须先输入用户名，验证才能开始','Before orders the two actions; must takes the base verb enter.','Before 规定动作顺序；must 后接动词原形 enter。'],
 ['Our network connects devices which have been approved by administrators','我们的网络连接已经获管理员批准的设备','Which introduces a relative clause; have been approved is passive.','Which 引出关系从句；have been approved 是被动语态。'],
 ['We had saved the document before power suddenly failed','在突然断电之前，我们已经保存了文档','Past-perfect had saved marks the earlier action before failed.','Had saved 是过去完成时，表示早于 failed 的动作。'],
 ['The program cannot continue unless additional memory becomes available','除非有额外内存可用，否则程序无法继续','Unless gives the necessary exception to cannot continue.','Unless 引出程序能够继续的必要例外条件。'],
 ['If verification fails, the account will remain temporarily locked','如果验证失败，账号会暂时保持锁定','Use present fails in the if clause and will remain in the result.','If 从句使用一般现在时 fails；结果用 will remain。'],
 ['Unless backups exist, lost records cannot be recovered automatically','除非存在备份，否则丢失的记录无法自动恢复','Cannot be recovered is modal passive; unless introduces the condition.','Cannot be recovered 是情态动词被动结构；unless 引出条件。'],
 ['Although access was denied, our saved progress remained intact','尽管访问被拒绝，我们保存的进度仍然完好','Although contrasts denied access with progress remaining intact.','Although 对比访问被拒绝与进度保持完好。'],
 ['Only authorized users may modify these protected configuration files','只有获得授权的用户才可以修改这些受保护的配置文件','Only restricts the subject; may expresses permission here.','Only 限定主语范围；这里 may 表示许可。'],
 ['The document has been encrypted to prevent unauthorized access','文档已经过加密，以防止未经授权的访问','Has been encrypted is perfect passive; to prevent states purpose.','Has been encrypted 是完成时被动语态；to prevent 表示目的。'],
 ['Our requests were delayed because the connection became unstable','由于连接变得不稳定，我们的请求被延迟了','Were delayed is passive; because introduces the reason.','Were delayed 是被动语态；because 引出原因。'],
 ['The technician asked whether every backup had finished successfully','技术人员询问每个备份是否都已经成功完成','Whether introduces an indirect question; had finished looks back in time.','Whether 引出间接问句；had finished 表示更早完成。'],
 ['You should have verified this address before sending confidential information','你本应该在发送机密信息之前核对这个地址','Should have verified refers to a past precaution that was advisable.','Should have verified 表示过去本应该采取的核对措施。'],
 ['The file which you requested is no longer available','你请求的文件已经不再可用','Which you requested modifies file; no longer means not anymore.','Which you requested 修饰 file；no longer 表示不再。'],
 ['We will restore access provided that your credentials remain valid','只要你的凭据仍有效，我们就会恢复访问','Provided that states a condition; credentials is plural and takes remain.','Provided that 表示条件；复数 credentials 搭配 remain。'],
 ['By midnight, our team had completed all required system checks','到午夜时，我们的队伍已经完成所有必需的系统检查','Had completed marks completion before the past deadline midnight.','Had completed 表示在过去的截止时间午夜之前已经完成。'],
 ['Neither of these devices supports the requested transmission format','这两台设备都不支持所请求的传输格式','Neither takes singular supports in the formal agreement used here.','在这里的正式一致结构中，neither 搭配单数 supports。'],
 ['The administrator explained why our earlier request had been rejected','管理员解释了我们先前的请求为什么被拒绝','Why introduces the explanation; had been rejected is perfect passive.','Why 引出解释；had been rejected 是过去完成时被动语态。'],
 ['If the network had recovered sooner, we could have continued','如果网络更早恢复，我们本来就能够继续','Past-perfect had recovered and could have continued describe an unreal past condition.','Had recovered 与 could have continued 表示与过去事实相反的假设。'],
 ['Despite repeated warnings, some users continued sharing their private credentials','尽管多次收到警告，一些用户仍继续分享私人凭据','Despite is followed by the noun phrase repeated warnings.','Despite 后接名词短语 repeated warnings。'],
 ['The updated software is more reliable than its predecessor','更新后的软件比先前的版本更加可靠','More reliable than forms the comparison; predecessor means the earlier version.','More reliable than 构成比较；predecessor 指先前的版本。'],
 ['Our archive contains records that were created before migration','我们的档案包含在迁移之前建立的记录','That were created before migration is a passive relative clause modifying records.','That were created before migration 是修饰 records 的被动关系从句。'],
 ['No changes will take effect until every service has restarted','每个服务都重新启动之后，更改才会生效','No plus until postpones the effect until the stated event is complete.','No 加 until 表示必须等到指定事件完成后才会生效。'],
 ['The warning indicates that insufficient storage may have interrupted processing','警告说明存储空间不足可能中断了处理过程','May have interrupted expresses a possible past event, not certainty.','May have interrupted 表示可能发生的过去事件，而非确定。'],
 ['Anyone whose token has expired must authenticate before continuing','令牌已过期的人必须先验证身份才能继续','Whose shows possession; must authenticate is the required action.','Whose 表示所属；must authenticate 表示必须进行的操作。']
],1);

const result=[...byId.values()];
for(const realm of ['maple','forest','camp','ruins'])assert.equal(result.filter(q=>q.realm===realm).length,60,realm);
fs.writeFileSync(file,JSON.stringify(result,null,2)+'\n');fs.writeFileSync(path.join(root,'data/question_hints.json'),JSON.stringify(hints,null,2)+'\n');
console.log(`Wrote ${result.length} questions (240 world questions, 19 legacy) and ${Object.keys(hints).length} hints.`);
