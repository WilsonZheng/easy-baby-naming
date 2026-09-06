/**
 * 英文名库。只收录在英语国家长期通用、拼写稳定、无明显负面联想的名字。
 *
 * 格式：名|性别|风格|英语重音读法|中文近似音|含义|语源|意象标签|可桥接的拼音音节|提示标记
 *  - 性别 f 女 / m 男 / n 中性
 *  - 风格 classic 经典 / nature 自然 / short 简洁 / modern 现代
 *  - 意象标签用于和中文名「意思呼应」配对
 *  - 桥接音节用于和中文名「读音相近」配对（不带声调）
 *  - 提示标记 spell 拼写容易出错 / mis 英语母语者常读错 / nick 昵称牵引强 / trend 当下非常流行
 */
export type EnGender = 'f' | 'm' | 'n'
export type EnStyle = 'classic' | 'nature' | 'short' | 'modern'
export type EnFlag = 'spell' | 'mis' | 'nick' | 'trend'

export interface EnglishName {
  name: string
  gender: EnGender
  styles: EnStyle[]
  pron: string
  zhPron: string
  meaning: string
  origin: string
  sem: string[]
  bridge: string[]
  flags: EnFlag[]
}

const RAW = `
Emma|f|classic,short|EM-uh|艾玛|完整、普遍|日耳曼|pure,whole||trend
Olivia|f|classic,nature|oh-LIV-ee-uh|奥莉薇娅|橄榄树、和平|拉丁|peace,nature||trend
Sophia|f|classic|so-FEE-uh|苏菲娅|智慧|希腊|wise|su,suo|trend
Grace|f|classic,short|GRAYSS|格蕾丝|优雅、恩典|拉丁|grace|ge|
Claire|f|classic,short|KLAIR|克莱尔|明亮、清澈|拉丁|light,pure|ke|
Clara|f|classic|KLA-ruh|克拉拉|明亮|拉丁|light|ke|
Alice|f|classic|AL-iss|爱丽丝|高贵|日耳曼|noble|ai|
Eleanor|f|classic|EL-uh-nor|埃莉诺|光亮|古法语|light||nick
Julia|f|classic|JOO-lee-uh|朱莉娅|青春|拉丁|youth|ju,zhu|
Laura|f|classic,nature|LOR-uh|劳拉|月桂|拉丁|nature,honor|luo|
Rose|f|classic,nature,short|ROHZ|萝丝|玫瑰|拉丁|nature,beauty|ruo|
Lily|f|nature,short|LIL-ee|莉莉|百合|英语|nature,pure|li|trend
Iris|f|nature,short|EYE-riss|艾莉丝|彩虹、鸢尾|希腊|nature,light|yi|
Ivy|f|nature,short|EYE-vee|艾薇|常春藤|英语|nature|yi|
Hazel|f|nature|HAY-zel|海泽尔|榛树|英语|nature|hai|trend
Willow|f|nature|WIL-oh|薇洛|柳树|英语|nature|wei|trend
Luna|f|nature,short|LOO-nuh|露娜|月亮|拉丁|star,night|lu,luan|trend
Nora|f|classic,short|NOR-uh|诺拉|荣誉、光|爱尔兰|light,honor|nuo,na|
Maya|f|short,modern|MY-uh|玛雅|水、幻|多源|nature,water|ma,mei|
Mia|f|short|MEE-uh|米娅|我的|意大利|joy|mi|trend
Ella|f|classic,short|EL-uh|艾拉|光、他者|日耳曼|light|e|
Elena|f|classic|eh-LAY-nuh|艾莲娜|明亮火炬|希腊|light|lian,lin|
Chloe|f|classic|KLOH-ee|克洛伊|新绿嫩芽|希腊|nature,spring|ke|mis
Zoe|f|short|ZOH-ee|佐伊|生命|希腊|life|zuo|mis
Naomi|f|classic|nay-OH-mee|娜奥米|愉悦|希伯来|joy|na|
Esther|f|classic|ES-ter|艾丝特|星辰|波斯|star|si|
Hannah|f|classic|HAN-uh|汉娜|恩典|希伯来|grace|han|
Anna|f|classic,short|AN-uh|安娜|恩典|希伯来|grace|an,na|
Anne|f|classic,short|ANN|安|恩典|希伯来|grace|an,yan|
Sarah|f|classic|SAIR-uh|莎拉|公主|希伯来|noble|sa,sha|
Vera|f|classic,short|VEER-uh|薇拉|真实、信念|拉丁|true|wei|
Nina|f|short|NEE-nuh|妮娜|小女孩|多源|grace|ni,nian|
Ada|f|classic,short|AY-duh|艾达|高贵|日耳曼|noble|a|
June|f|short,nature|JOON|琼|六月|拉丁|nature,summer|jun,juan|
Joy|f|short|JOY|乔伊|喜悦|英语|joy||
Faith|f|short|FAYTH|菲丝|信念|英语|true||
Eve|f|classic,short|EEV|伊芙|生命|希伯来|life|yi|
Elise|f|classic|eh-LEESS|伊莉丝|上帝的誓约|希伯来|grace|li|
Celia|f|classic|SEE-lee-uh|西莉亚|天空|拉丁|sky|xi,se|
Stella|f|classic|STEL-uh|斯特拉|星星|拉丁|star|si|
Aurora|f|classic,nature|uh-ROR-uh|奥萝拉|黎明|拉丁|light,dawn|ao|
Serena|f|classic|seh-REE-nuh|塞琳娜|宁静|拉丁|peace|sai,ren|
Amelia|f|classic|uh-MEEL-yuh|艾米莉亚|勤勉|日耳曼|strong||trend
Isabel|f|classic|IZ-uh-bel|伊莎贝尔|上帝的誓约|西班牙|grace||nick
Vivian|f|classic|VIV-ee-un|薇薇安|生机勃勃|拉丁|life|wei|
Fiona|f|classic|fee-OH-nuh|菲欧娜|白皙、纯净|苏格兰|pure|fei|
Lena|f|short|LEE-nuh|莉娜|光|希腊|light|lin,lan,li|
Tessa|f|short|TESS-uh|泰莎|收获|希腊|nature|te|
Freya|f|nature|FRAY-uh|弗蕾娅|北欧女神|北欧|noble||trend
Astrid|f|classic|ASS-trid|阿斯特丽德|神圣的美|北欧|star,noble||spell
Ingrid|f|classic|ING-grid|英格丽|美丽|北欧|beauty|ying|spell
Sylvia|f|nature|SIL-vee-uh|西尔维娅|森林|拉丁|nature,forest|xi|
Flora|f|nature|FLOR-uh|芙罗拉|花神|拉丁|nature,flower|fu|
Daphne|f|nature|DAF-nee|达芙妮|月桂|希腊|nature|da|
Phoebe|f|classic|FEE-bee|菲比|明亮|希腊|light|fei|mis
Thea|f|short|THEE-uh|西娅|女神、光|希腊|light|xi|
Cora|f|classic,short|KOR-uh|柯拉|少女、心|希腊|pure|ke,ke|
Nova|f|modern,short|NOH-vuh|诺娃|新星|拉丁|star,new|nuo|trend
Wren|n|nature,short|REN|芮恩|鹪鹩|英语|nature,bird|ren|
Sage|n|nature,short|SAYJ|赛姬|智慧、鼠尾草|拉丁|wise,nature|se|
Marina|f|nature|muh-REE-nuh|玛丽娜|属于海|拉丁|water,sea|ma|
Pearl|f|nature|PURL|珀尔|珍珠|拉丁|jewel,pure|po|
Jade|f|nature,short|JAYD|婕德|玉|西班牙|jewel|jie|
Amber|f|nature|AM-ber|安柏|琥珀|阿拉伯|jewel|an|
Ruby|f|nature,short|ROO-bee|露比|红宝石|拉丁|jewel|ru|
Olive|f|nature,short|OL-iv|奥莉芙|橄榄|拉丁|nature,peace|ao|
Poppy|f|nature,short|POP-ee|波比|罂粟花|英语|nature,flower|po|
Daisy|f|nature,short|DAY-zee|黛西|雏菊|英语|nature,flower|dai|
Violet|f|nature|VY-uh-let|薇奥莱特|紫罗兰|拉丁|nature,flower|wei|
Jasmine|f|nature|JAZ-min|茉莉|茉莉花|波斯|nature,flower|jia|
Lucy|f|classic,short|LOO-see|露西|光|拉丁|light|lu|
Lucia|f|classic|LOO-shuh|露西娅|光|拉丁|light|lu|mis
Nadia|f|classic|NAH-dee-uh|娜迪亚|希望|斯拉夫|hope|na|
Talia|f|modern|TAH-lee-uh|塔莉娅|晨露|希伯来|nature,dawn|ta|
Layla|f|modern|LAY-luh|蕾拉|夜|阿拉伯|night|lai,lei|trend
Alina|f|modern|uh-LEE-nuh|艾莉娜|明亮|斯拉夫|light|li,lin|
Maia|f|nature,short|MY-uh|玛雅|春之女神|希腊|nature,spring|ma,mei|
Mira|f|short|MEER-uh|米拉|奇迹、和平|多源|peace,star|mi|
Elin|f|short|EH-lin|艾琳|光|北欧|light|lin,ling|
Rina|f|short|REE-nuh|莉娜|喜悦|多源|joy|lin,ling|
Erin|f|classic,short|EH-rin|艾琳|爱尔兰|爱尔兰|nature|lin,ling,yin|
Selena|f|classic|seh-LEE-nuh|赛琳娜|月亮女神|希腊|star,night|xi|
Susanna|f|classic|soo-ZAN-uh|苏珊娜|百合|希伯来|nature,flower|su,shan|nick
Lydia|f|classic|LID-ee-uh|莉迪亚|吕底亚人|希腊|noble|li|
Miriam|f|classic|MEER-ee-um|米里亚姆|海之星|希伯来|sea,star|mi|
Ramona|f|classic|ruh-MOH-nuh|拉蒙娜|智慧的守护|西班牙|wise|ran|
Rosalind|f|classic|ROZ-uh-lind|罗莎琳德|柔美的玫瑰|日耳曼|nature,beauty|luo|spell
Beatrice|f|classic|BEE-uh-triss|碧翠丝|带来喜悦的人|拉丁|joy|bi|nick
Margaret|f|classic|MAR-guh-ret|玛格丽特|珍珠|希腊|jewel,pure|ma|nick
Katherine|f|classic|KATH-rin|凯瑟琳|纯净|希腊|pure|kai|nick
Caroline|f|classic|KAIR-uh-line|卡洛琳|自由的人|日耳曼|strong|ka|nick
Charlotte|f|classic|SHAR-lot|夏洛特|自由的人|法语|strong|xia,sha|trend
Evelyn|f|classic|EV-uh-lin|伊芙琳|渴望的生命|英语|life|lin|trend
Adeline|f|classic|AD-uh-line|艾德琳|高贵|日耳曼|noble|ai|
Rosemary|f|nature|ROHZ-mair-ee|罗丝玛丽|海之露、迷迭香|拉丁|nature,sea|luo|
Coral|f|nature|KOR-ul|柯洛|珊瑚|希腊|sea,jewel|ke|
Meredith|f|classic|MER-uh-dith|梅瑞狄斯|伟大的统治者|威尔士|strong|mei|spell
Bridget|f|classic|BRIJ-it|布丽姬|力量、崇高|爱尔兰|strong||
Alma|f|classic,short|AL-muh|艾玛|滋养的灵魂|拉丁|grace|an|
Elsa|f|short|EL-suh|艾尔莎|上帝的誓约|日耳曼|grace|e|
Greta|f|short|GRET-uh|葛蕾塔|珍珠|德语|jewel,pure|ge|
Linnea|f|nature|lin-NAY-uh|琳妮亚|林奈花|瑞典|nature,flower|lin,ling|spell
Aria|f|modern,short|AR-ee-uh|艾莉亚|旋律|意大利|music|ya|trend
Elodie|f|modern|EL-uh-dee|艾洛蒂|财富的歌|法语|music|e|spell
Camille|f|classic|kuh-MEEL|卡蜜尔|侍奉神明的人|拉丁|noble|ka|mis
Juliet|f|classic|JOO-lee-et|茱丽叶|青春|拉丁|youth|ju,zhu|
Colette|f|classic|koh-LET|柯莱特|胜利|法语|strong|ke|
Simone|f|classic|see-MOHN|西蒙|倾听者|希伯来|wise|xi|mis
Renee|f|classic|ruh-NAY|蕾妮|重生|法语|new,life|ren|mis
Noelle|f|classic|noh-EL|诺艾儿|圣诞|法语|joy|nuo|
Yvonne|f|classic|ee-VON|伊芳|紫杉|法语|nature|yun,yong|mis
Una|f|short|OO-nuh|乌娜|唯一|爱尔兰|whole|yun,wu|mis
Wendy|f|classic|WEN-dee|温蒂|朋友|英语|joy|wen|
Tina|f|short|TEE-nuh|蒂娜|小而美|拉丁|grace|ting,tian|nick
Lana|f|short|LAH-nuh|拉娜|光、羊毛|多源|light|lan,lang|
Lauren|f|classic|LOR-en|萝伦|月桂|拉丁|nature,honor|lan,lin|
Sydney|n|modern|SID-nee|西妮|宽阔的草地|英语|nature|xi|
Cynthia|f|classic|SIN-thee-uh|辛西娅|月神|希腊|star,night|xin,xing|spell
Amy|f|classic,short|AY-mee|艾米|被爱的人|拉丁|love|ai|
May|f|short,nature|MAY|梅|五月、山楂花|英语|nature,spring|mei|
Leah|f|classic,short|LEE-uh|莉亚|疲倦、草地|希伯来|nature|li,lei|
Danielle|f|classic|dan-YEL|丹妮尔|神是我的审判|希伯来|true|dan|
Judith|f|classic|JOO-dith|茱蒂丝|赞美|希伯来|joy|ju|
Elaine|f|classic|ee-LAYN|伊莲|光|古法语|light|lian,lan|
Corinne|f|classic|kuh-RIN|柯琳|少女|希腊|pure|ke,lin|
Adele|f|classic|uh-DEL|艾黛儿|高贵|日耳曼|noble|ai|
Noel|m|classic,short|noh-EL|诺尔|圣诞|法语|joy|nuo|
Liam|m|short,modern|LEE-um|廉姆|坚定的守护者|爱尔兰|strong|liang,lian|trend
Noah|m|classic,short|NOH-uh|诺亚|安息|希伯来|peace|nuo|trend
Ethan|m|classic|EE-thun|伊森|坚定持久|希伯来|strong|yi|
Owen|m|classic,short|OH-en|欧文|出身高贵|威尔士|noble|ou,wen|
Leo|m|classic,short|LEE-oh|里奥|狮子|拉丁|strong|li,lei|trend
Levi|m|classic,short|LEE-vye|列维|连结|希伯来|whole|li|
Isaac|m|classic|EYE-zik|艾萨克|欢笑|希伯来|joy|ai|spell
Elias|m|classic|ee-LY-us|以利亚|我的神是主|希伯来|light|li|
Julian|m|classic|JOO-lee-un|朱利安|青春|拉丁|youth|ju,jun,zhu|
Adrian|m|classic|AY-dree-un|阿德里安|来自海滨|拉丁|sea|an|
Simon|m|classic|SY-mun|西蒙|倾听者|希伯来|wise|xi,sen|
Nathan|m|classic|NAY-thun|内森|赠礼|希伯来|gift|nan,nai|
Nathaniel|m|classic|nuh-THAN-yul|纳撒尼尔|神的赠礼|希伯来|gift|nan|nick
Samuel|m|classic|SAM-yoo-ul|塞缪尔|神听见了|希伯来|wise|sen,shan|nick
Daniel|m|classic|DAN-yul|丹尼尔|神是我的审判|希伯来|true|dan|nick
Benjamin|m|classic|BEN-juh-min|班杰明|右手之子|希伯来|strong|ben|nick
Theodore|m|classic|THEE-uh-dor|西奥多|神的赠礼|希腊|gift|tian|nick
Henry|m|classic|HEN-ree|亨利|家园的主人|日耳曼|strong,home|heng,han|
Oliver|m|classic|OL-i-ver|奥利佛|橄榄树|拉丁|peace,nature|ao|trend
Arthur|m|classic|AR-ther|亚瑟|熊、高贵|凯尔特|strong,noble|a|
Edward|m|classic|ED-werd|爱德华|富足的守护者|英语|strong|e|nick
Charles|m|classic|CHARLZ|查尔斯|自由的人|日耳曼|strong|cha|nick
George|m|classic|JORJ|乔治|耕作土地的人|希腊|nature,earth|jiao|
Vincent|m|classic|VIN-sent|文森特|征服|拉丁|strong|wen|
Julius|m|classic|JOO-lee-us|尤利乌斯|青春|拉丁|youth|ju|
Victor|m|classic|VIK-ter|维克多|胜利者|拉丁|strong|wei|
Martin|m|classic|MAR-tin|马丁|战神的|拉丁|strong|ma|
Marcus|m|classic|MAR-kus|马库斯|战神的|拉丁|strong|ma|
Lucas|m|classic|LOO-kus|卢卡斯|光|拉丁|light|lu|trend
Luke|m|classic,short|LOOK|路克|光|拉丁|light|lu|
Miles|m|classic,short|MYLZ|迈尔斯|士兵、宽容|拉丁|strong|mai|
Reid|m|short|REED|里德|红发、芦苇|英语|nature|rui,ri|
Ray|m|short|RAY|雷|明智的守护者|日耳曼|light,wise|lei,rui|
Roy|m|short|ROY|罗伊|国王|法语|noble|ruo,rui|
Ian|m|short|EE-un|伊恩|神是仁慈的|苏格兰|grace|yan,yi|
Evan|m|short|EV-un|伊凡|神是仁慈的|威尔士|grace|fan,wen|
Aaron|m|classic|AIR-un|亚伦|高山|希伯来|strong,mountain|an|
Alan|m|classic|AL-un|艾伦|英俊、和谐|凯尔特|grace|an,lan|
Colin|m|classic|KOL-in|柯林|幼犬、胜利|凯尔特|strong|ke,kang|
Conrad|m|classic|KON-rad|康拉德|勇敢的谋士|日耳曼|wise,strong|kang|
Dean|m|short|DEEN|迪恩|山谷、领袖|英语|nature|ding,di|
Dylan|m|modern|DIL-un|狄伦|海之子|威尔士|sea|di|
Ellis|m|short|EL-iss|艾利斯|仁慈|威尔士|grace|e|
Felix|m|classic|FEE-liks|菲力克斯|幸运、快乐|拉丁|joy|fei|
Gabriel|m|classic|GAY-bree-ul|加百列|神是我的力量|希伯来|strong|jia|nick
Hugo|m|classic|HYOO-goh|雨果|心智、灵魂|日耳曼|wise|hao,hu|
Isaiah|m|classic|eye-ZAY-uh|以赛亚|神是救赎|希伯来|hope|ai|spell
Jonah|m|classic|JOH-nuh|约拿|鸽子|希伯来|peace,bird|jun|
Joel|m|short|JOH-el|乔尔|耶和华是神|希伯来|true|jue,zhou|
Jasper|m|classic,nature|JASS-per|贾斯珀|碧玉|波斯|jewel|jia|
Kai|n|short,modern|KY|凯|海、大海|夏威夷|sea|kai|
Karl|m|classic,short|KARL|卡尔|自由的人|日耳曼|strong|ka,kai|
Lance|m|short|LANSS|蓝斯|土地、长矛|日耳曼|strong|lang,lan|
Lawrence|m|classic|LOR-ense|劳伦斯|月桂|拉丁|nature,honor|lang,luo|nick
Malcolm|m|classic|MAL-kum|马尔科姆|圣哥伦巴的信徒|苏格兰|noble|ma|
Nolan|m|modern|NOH-lun|诺兰|冠军|爱尔兰|strong|nuo,lan|
Oscar|m|classic|OSS-ker|奥斯卡|神之矛|爱尔兰|strong|ao|
Quentin|m|classic|KWEN-tin|昆汀|第五|拉丁|whole|qun|spell
Rowan|n|nature|ROH-un|罗恩|花楸树|爱尔兰|nature,tree|ruo|
Silas|m|classic|SY-lus|赛拉斯|森林|拉丁|nature,forest|xi|
Theo|m|short|THEE-oh|西奥|神的赠礼|希腊|gift|tian|
Toby|m|short|TOH-bee|托比|神是良善的|希伯来|grace|tuo|
Wesley|m|classic|WESS-lee|卫斯理|西边的草地|英语|nature|wei|
Xavier|m|classic|ZAY-vee-er|泽维尔|新居|巴斯克|new|xia|mis
Zane|m|short,modern|ZAYN|赞恩|神是仁慈的|希伯来|grace|zan,zhan|
Zachary|m|classic|ZAK-uh-ree|扎克瑞|神已铭记|希伯来|true|zha|nick
Alex|n|short|AL-eks|亚历克斯|人类的守护者|希腊|strong|a|nick
Avery|n|modern|AY-vuh-ree|艾芙瑞|精灵的谋士|英语|wise|ai|
Blake|n|short|BLAYK|布莱克|明亮或漆黑|英语|light|bo|
Cameron|n|classic|KAM-ur-un|卡梅隆|弯鼻子|苏格兰|strong|kang|
Casey|n|short|KAY-see|凯西|警觉|爱尔兰|wise|kai|
Eden|n|short,nature|EE-den|伊甸|乐园|希伯来|nature,peace|yi|
Emery|n|modern|EM-uh-ree|艾莫瑞|勤勉的领袖|日耳曼|strong|e|
Finley|n|nature|FIN-lee|芬利|白皙的战士|苏格兰|strong|fen|
Harper|n|modern|HAR-per|哈波|竖琴手|英语|music|ha|trend
Jordan|n|classic|JOR-dun|乔丹|流淌而下|希伯来|water|jun|
Morgan|n|classic|MOR-gun|摩根|海之环|威尔士|sea|mo|
Quinn|n|short|KWIN|昆恩|智慧、首领|爱尔兰|wise|qun|
Reese|n|short|REESS|里斯|热忱|威尔士|strong|rui,ri|
River|n|nature|RIV-er|瑞福|河流|英语|water,nature|ri|
Robin|n|classic,nature|ROB-in|罗宾|知更鸟|英语|nature,bird|ruo|
Skyler|n|modern|SKY-ler|斯凯勒|学者、庇护|荷兰|wise|si|spell
Caleb|m|classic|KAY-leb|凯勒|忠诚勇敢|希伯来|true,strong|kai|
Carter|m|modern|KAR-ter|卡特|车夫|英语|strong|ka|trend
Ezra|m|classic,short|EZ-ruh|以斯拉|帮助|希伯来|grace|e|
Elliot|m|classic|EL-ee-ut|艾略特|主是我的神|希伯来|true|e|
Emmett|m|classic|EM-it|艾米特|全能|日耳曼|strong|e|
Everett|m|classic|EV-uh-ret|艾佛瑞|强壮勇武|日耳曼|strong|e|
Dominic|m|classic|DOM-i-nik|多米尼克|属于主的|拉丁|noble|dong|
Declan|m|modern|DEK-lun|德克兰|充满善意|爱尔兰|grace|de|
Desmond|m|classic|DEZ-mund|戴斯蒙|来自南方|爱尔兰|strong|de|
Duncan|m|classic|DUN-kun|邓肯|棕发的战士|苏格兰|strong|dun,dong|
Sebastian|m|classic|suh-BAS-chun|塞巴斯汀|受尊敬的|希腊|noble|se|nick
Spencer|m|classic|SPEN-ser|史宾赛|管家|英语|wise|si|
Tristan|m|classic|TRISS-tun|崔斯坦|喧嚣、忧思|凯尔特|strong|te|
Ronan|m|modern|ROH-nun|罗南|小海豹|爱尔兰|sea,nature|ruo,rong|
Grant|m|short|GRANT|格兰特|伟大、授予|法语|strong|gang|
Bruno|m|classic|BROO-noh|布鲁诺|棕色|日耳曼|nature|bo|
Cedric|m|classic|SED-rik|塞德里克|慷慨的领袖|凯尔特|noble|se|
Ivan|m|classic|EYE-vun|伊凡|神是仁慈的|斯拉夫|grace|yi,wan|mis
Louis|m|classic|LOO-ee|路易|著名的战士|法语|strong|lu|mis
Marshall|m|classic|MAR-shul|马歇尔|元帅|法语|strong|ma|
Maxwell|m|classic|MAKS-wel|麦斯威尔|大泉之地|苏格兰|water,strong|mai|nick
Preston|m|classic|PRESS-tun|普雷斯顿|教士的村庄|英语|home|pu|
Warren|m|classic|WOR-un|华伦|守卫|日耳曼|strong|wan,wen|
Rupert|m|classic|ROO-pert|鲁伯特|闪耀的名声|日耳曼|light|ru|
Stuart|m|classic|STOO-art|斯图尔特|管家|苏格兰|wise|si|
Bennett|m|classic|BEN-it|班尼特|受祝福的|拉丁|grace|ben|
Austin|m|classic|OSS-tin|奥斯汀|威严的|拉丁|noble|ao|
Rafael|m|classic|rah-fy-EL|拉斐尔|神已医治|希伯来|grace|ruo|mis
Roman|m|modern|ROH-mun|罗曼|罗马人|拉丁|strong|ruo,rong|
Soren|m|modern|SOR-un|索伦|严肃的|北欧|wise|suo,song|
`.trim()

const seen = new Set<string>()

export const ENGLISH_NAMES: EnglishName[] = RAW.split('\n')
  .map((row) => {
    const [name, gender, styles, pron, zhPron, meaning, origin, sem, bridge, flags] = row.split('|')
    return {
      // 数据里用 Name2 做重复条目的占位，实际展示去掉尾部数字
      name: name.replace(/\d+$/, ''),
      gender: gender as EnGender,
      styles: styles.split(',').filter(Boolean) as EnStyle[],
      pron,
      zhPron,
      meaning,
      origin,
      sem: (sem ?? '').split(',').filter(Boolean),
      bridge: (bridge ?? '').split(',').filter(Boolean),
      flags: (flags ?? '').split(',').filter(Boolean) as EnFlag[],
    }
  })
  .filter((n) => {
    if (seen.has(n.name)) return false
    seen.add(n.name)
    return true
  })

export const ENGLISH_NAME_MAP = new Map(ENGLISH_NAMES.map((n) => [n.name, n]))
