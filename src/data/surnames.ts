/** 常见姓氏 → 普通话拼音（音节以空格分隔，复姓两个音节）。用于全名连读与英语可读性评估。 */
const RAW = `
李|lǐ|3;王|wáng|2;张|zhāng|1;刘|liú|2;陈|chén|2;杨|yáng|2;黄|huáng|2;赵|zhào|4
吴|wú|2;周|zhōu|1;徐|xú|2;孙|sūn|1;马|mǎ|3;朱|zhū|1;胡|hú|2;郭|guō|1
何|hé|2;高|gāo|1;林|lín|2;罗|luó|2;郑|zhèng|4;梁|liáng|2;谢|xiè|4;宋|sòng|4
唐|táng|2;许|xǔ|3;韩|hán|2;冯|féng|2;邓|dèng|4;曹|cáo|2;彭|péng|2;曾|zēng|1
肖|xiāo|1;田|tián|2;董|dǒng|3;袁|yuán|2;潘|pān|1;于|yú|2;蒋|jiǎng|3;蔡|cài|4
余|yú|2;杜|dù|4;叶|yè|4;程|chéng|2;苏|sū|1;魏|wèi|4;吕|lǚ|3;丁|dīng|1
任|rén|2;沈|shěn|3;姚|yáo|2;卢|lú|2;姜|jiāng|1;崔|cuī|1;钟|zhōng|1;谭|tán|2
陆|lù|4;汪|wāng|1;范|fàn|4;金|jīn|1;石|shí|2;廖|liào|4;贾|jiǎ|3;夏|xià|4
韦|wéi|2;付|fù|4;方|fāng|1;白|bái|2;邹|zōu|1;孟|mèng|4;熊|xióng|2;秦|qín|2
邱|qiū|1;江|jiāng|1;尹|yǐn|3;薛|xuē|1;闫|yán|2;段|duàn|4;雷|léi|2;侯|hóu|2
龙|lóng|2;史|shǐ|3;陶|táo|2;黎|lí|2;贺|hè|4;顾|gù|4;毛|máo|2;郝|hǎo|3
龚|gōng|1;邵|shào|4;万|wàn|4;钱|qián|2;严|yán|2;覃|qín|2;武|wǔ|3;戴|dài|4
莫|mò|4;孔|kǒng|3;向|xiàng|4;汤|tāng|1;温|wēn|1;康|kāng|1;施|shī|1;文|wén|2
牛|niú|2;樊|fán|2;葛|gě|3;邢|xíng|2;安|ān|1;齐|qí|2;常|cháng|2;傅|fù|4
柏|bǎi|3;计|jì|4;成|chéng|2;游|yóu|2;阳|yáng|2;裴|péi|2;席|xí|2;卫|wèi|4
屈|qū|1;鲍|bào|4;霍|huò|4;翁|wēng|1;隋|suí|2;甘|gān|1;景|jǐng|3;包|bāo|1
司|sī|1;柯|kē|1;蓝|lán|2;闵|mǐn|3;路|lù|4;骆|luò|4;丘|qiū|1;凌|líng|2
欧阳|ōu yáng|2;上官|shàng guān|1;司马|sī mǎ|3;诸葛|zhū gě|3;慕容|mù róng|2
东方|dōng fāng|1;皇甫|huáng fǔ|3;尉迟|yù chí|2;独孤|dú gū|1;长孙|zhǎng sūn|1
`.trim()

export interface SurnameEntry {
  surname: string
  /** 空格分隔的音节，复姓有两个 */
  pinyin: string
  /** 最后一个音节的声调，用于与名字首字做连读判断 */
  tone: number
}

export const SURNAMES: SurnameEntry[] = RAW.split('\n')
  .flatMap((line) => line.split(';'))
  .map((t) => t.trim())
  .filter(Boolean)
  .map((t) => {
    const [surname, pinyin, tone] = t.split('|')
    return { surname, pinyin, tone: Number(tone) }
  })

export const SURNAME_MAP = new Map(SURNAMES.map((s) => [s.surname, s]))
