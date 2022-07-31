async function mdParse(src) {
  let split = RegExp(/\r?\n/)
  let arr_im1 = src.replace(/\r/, "").split(split)
  let arr_im2 = []
  let len = 0
  let arr_status = []
  let arr_bqPre = {
    "blockquote": RegExp(/^>+ /),
    "pre": RegExp(/^ {3}/)
  }
  return await procBr()     // read arr_im1, write arr_im2
    .then(async () => {
    await classify()        // read arr_im2, write arr_status
  }).then(async () => {
    await setListLv()       // read arr_im2, write arr_status
  }).then(async () => {
    await markupBlock()     // read arr_im2, write arr_im2
  }).then(async () => {
    await markupInline()    // read arr_im2, write arr_im2
  }).then(() => {
    return arr_im2.join("\n")
  })
  //
  // br の処理
  //
  async function procBr() {
    let j = 0
    for (let i = 0; i < arr_im1.length; i++) {
      /*
        br はなく、 br を受けていない（ br とは無関係＝ j 加算する）
        */
      if (
        (
          i === 0
          &&
          arr_im1[i].match(/ {2}$/) === null
        )
        ||
        (
          arr_im1[i].match(/ {2}$/) === null
          &&
          arr_im1[i - 1].match(/ {2}$/) === null
        )
      ) {
        arr_im2[j] = arr_im1[i].replace(/ {2}$/g, '<br>')
        j++
      }
      // br があり、 br を受けていない（ br の始まり＝ j に加算しない）
      else if (
        arr_im1[i].match(/ {2}$/) !== null
        &&
        i !== 0
        &&
        arr_im1[i - 1].match(/ {2}$/) === null
        ||
        i === 0
    ) {
        arr_im2[j] = arr_im1[i].replace(/ {2}$/, '<br>')
      }
      // br があり、 br を受けている（ br が続く＝ j に加算しない）
      else if (
        i !== 0
        &&
        arr_im1[i].match(/ {2}$/) !== null
        &&
        arr_im1[i - 1].match(/ {2}$/) !== null
        &&
        (
          arr_im1[i + 1].match(/^#{1,6} /) === null
          &&
          arr_im1[i + 1].match(/^[ \t]*(\*|\+|-|\d+\.) /) === null
          &&
          arr_im1[i + 1].match(/^(>+ | {3})/) === null
          &&
          arr_im1[i + 1].match(/^\|.*?\|$/) === null
        )
      ) {
        arr_im2[j] += arr_im1[i].replace(/ {2}$/, '<br>')
      }
      // br はなく、 br を受けている（ br が終わる＝ j に加算する）
      else if (
        i !== 0
        &&
        arr_im1[i].match(/ {2}$/) === null
        &&
        arr_im1[i - 1].match(/ {2}$/) !== null
      ) {
        arr_im2[j] += arr_im1[i]
        j++
      }
      // 勘案漏れ
      else {
        arr_im2[j] = arr_im1[i]
        j++
      }
    }
    return arr_im2
  }
  //
  // タグの種類を class として arr_status に書き込む
  //
  async function classify() {
    len = arr_im2.length
    for (let i = 0; i < len; i++) {
      arr_status[i] = {"listHierarchy": [], "listLv": 0}
    }
    for (let i = 0; i < len; i++) {
      if (arr_im2[i].match(/^$/)) {
        arr_status[i]["class"] = "blank"
      }
      else if (arr_im2[i].match(/^#{1,6} /) === null && arr_im2[i].match(/^[ \t]*(\*|\+|-|\d+\.) /) === null && arr_im2[i].match(/^(>+ | {3})/) === null && arr_im2[i].match(/^\|.*?\|$/) === null) {
        arr_status[i]["class"] = "plane"
      }
      else if (arr_im2[i].match(/^#{1} /)) {
        arr_status[i]["class"] = "h1"
      }
      else if (arr_im2[i].match(/^#{2} /)) {
        arr_status[i]["class"] = "h2"
      }
      else if (arr_im2[i].match(/^#{3} /)) {
        arr_status[i]["class"] = "h3"
      }
      else if (arr_im2[i].match(/^#{4} /)) {
        arr_status[i]["class"] = "h4"
      }
      else if (arr_im2[i].match(/^[ \t]*(\*|\+|-|\d+\.) /)) {
        arr_status[i]["class"] = "list"
      }
      else if (arr_im2[i].match(/^>+ /)) {
        arr_status[i]["class"] = "blockquote"
      }
      else if (arr_im2[i].match(/^ {3}/)) {
        arr_status[i]["class"] = "pre"
      }
      else if (arr_im2[i].match(/^\|.*?\|$/)) {
        arr_status[i]["class"] = "table"
      }
      else if (arr_im2[i].match(/^#{5} /)) {
        arr_status[i]["class"] = "h5"
      }
      else if (arr_im2[i].match(/^#{6} /)) {
        arr_status[i]["class"] = "h6"
      }
      else {
        arr_status[i]["class"] = "unknown"
      }
    }
    return arr_status
  }
  //
  // listLv を arr_status に書き込む
  //
  async function setListLv() {
    for (let i = 0; i < len; i++) {
      if (arr_status[i]["class"] === "list") {
        arr_status[i]["listLv"] = arr_im2[i].match(/^[ \t]*/)[0].length + 1
      }
    }
    return arr_status
  }
  //
  // ブロックレベルのマークアップ
  //
  async function markupBlock() {
    for (let i = 0; i < len; i++) {
      h = arr_status[i]["class"].match(/h1|h2|h3|h4|h5|h6/)
      // plane
      if (arr_status[i]["class"] === "plane") {
        await plane(i)
      }
      // list
      else if (arr_status[i]["class"] === "list") {
        await list(i)
      }
      // heading
      else if (h !== null) {
        await heading(i, h)
      }
      // blockquote
      else if (arr_status[i]["class"] === "blockquote") {
        await blockquote(i)
      }
      // pre
      else if (arr_status[i]["class"] === "pre") {
        await pre(i)
      }
      // table
      else if (arr_status[i]["class"] === "table") {
        // table 部分を抜き出して別プロセスで処理しているので i を飛ばす
        i = await table(i)
      }
      // 勘案漏れ
      else {
      }
    }
    return arr_im2
  }
  async function plane(i) {
    if (i !== 0) {
      if (arr_status[i - 1]["br"] !== 1) {
        arr_im2[i] = arr_im2[i].replace(/(.*)/, '<p>$1</p>')
        }
      else {
        arr_im2[i] = arr_im2[i]
      }
    }
    else {
      arr_im2[i] = arr_im2[i].replace(/(.*)/, '<p>$1</p>')
    }
    return true
  }
  async function list(i) {
    /*
      リストが続く
      */
    if (
      i !== 0
      &&
      i !== len - 1
      &&
      arr_status[i - 1]["class"] === "list"
      &&
      arr_status[i - 1]["listLv"] >= arr_status[i]["listLv"]
      &&
      arr_status[i + 1]["class"] === "list"
      &&
      arr_status[i + 1]["listLv"] >= arr_status[i]["listLv"]
    ) {
      arr_status[i]["listHierarchy"] = arr_status[i - 1]["listHierarchy"].slice()
      arr_im2[i] = `<li>${arr_im2[i].replace(/^[ \t]*(\*|\+|-|\d+\.) /, "")}</li>`
    }
    /*
      リストが始まる
      */
    else if (
      i !== len - 1
      &&
      arr_status[i + 1]["class"] === "list"
      &&
      arr_status[i + 1]["listLv"] >= arr_status[i]["listLv"]
      &&
      (
        arr_status[i - 1]["class"] !== "list"
        ||
        arr_status[i - 1]["listLv"] < arr_status[i]["listLv"]
        ||
        i === 0
      )
    ) {
      if (i !== 0) {
        arr_status[i]["listHierarchy"] = arr_status[i - 1]["listHierarchy"].slice()
        arr_status[i]["listHierarchy"].push(listType(i))
      }
      else {
        arr_status[i]["listHierarchy"].push(listType(i))
      }
      arr_im2[i] = `<${listType(i)}><li>${arr_im2[i].replace(/^[ \t]*(\*|\+|-|\d+\.) /, "")}</li>`
    }
    /*
      リストが終わる
      */
    else if (
      i !== 0
      &&
      arr_status[i - 1]["class"] === "list"
      &&
      arr_status[i - 1]["listLv"] >= arr_status[i]["listLv"]
      &&
      (
        arr_status[i + 1]["class"] !== "list"
        ||
        (
          arr_status[i + 1]["class"] === "list"
          &&
          arr_status[i + 1]["listLv"] < arr_status[i]["listLv"]
        )
        ||
        i === len - 1
      )
    ) {
      let w0 = arr_status[i - 1]["listHierarchy"].slice()
      let w1 = ""
      for (let j = 0; j < arr_status[i]["listLv"] - arr_status[i + 1]["listLv"]; j++) {
        w1 += `</${w0.pop()}>`
      }
      arr_status[i]["listHierarchy"] = w0.slice()
      arr_im2[i] = `<li>${arr_im2[i].replace(/^[ \t]*(\*|\+|-|\d+\.) /, "")}</li>${w1}`
    }
    /*
      リストは始まりであり終わりである
      */
    else if (
      (
        arr_status[i - 1]["class"] !== "list"
        &&
        arr_status[i + 1]["class"] !== "list"
        )
        ||
        (
          i !== 0
          &&
          i !== len - 1
          &&
          arr_status[i - 1]["class"] === "list"
          &&
          arr_status[i - 1]["listLv"] < arr_status[i]["listLv"]
          &&
          arr_status[i + 1]["class"] === "list"
          &&
          arr_status[i + 1]["listLv"] < arr_status[i]["listLv"]
        )
        ||
        (
          len - 1 === 0
        )
    ) {
      if (i !== 0) {
        arr_status[i]["listHierarchy"] = arr_status[i - 1]["listHierarchy"].slice()
        arr_status[i]["listHierarchy"].push(listType(i))
      }
      else {
        arr_status[i]["listHierarchy"].push(listType(i))
      }
      let w0 = arr_status[i]["listHierarchy"].slice()
      let w1 = ""
      for (let j = 0; j < arr_status[i]["listLv"] - arr_status[i + 1]["listLv"]; j++) {
        w1 += `</${w0.pop()}>`
      }
      arr_im2[i] = `<${listType(i)}><li>${arr_im2[i].replace(/^[ \t]*(\*|\+|-|\d+\.) /, "")}</li>${w1}`
    }
    else {
    }
  }
  function listType(i) {
    if (arr_im2[i].match(/^[ \t]*(\*|\+|-) /)) {
      return "ul"
    }
    else if (arr_im2[i].match(/^[ \t]*\d+\. /)) {
      return "ol"
    }
    else {
      return "ul"
    }
  }
  async function heading(i, h) {
    arr_im2[i] = arr_im2[i].replace(/^#{1,6} (.*)/, `<${h[0]}>$1</${h[0]}>`)
    return true
  }
  async function blockquote(i) {
  


　　　ここをやる



    return true
  }
  async function pre(i) {
    // 続く
    if (
      arr_status[i - 1]["class"] === "pre"
      &&
      arr_status[i + 1]["class"] === "pre"
    ) {
      arr_im2[i] = arr_im2[i].replace(/^ {3}/, "")
    }
    // 始まる
    else if (
      arr_status[i - 1]["class"] !== "pre"
      &&
      arr_status[i + 1]["class"] === "pre"
    ) {
      arr_im2[i] = arr_im2[i].replace(/^ {3}/, '<pre>')
    }
    // 終わる
    else if (
      arr_status[i - 1]["class"] === "pre"
      &&
      arr_status[i + 1]["class"] !== "pre"
    ) {
      arr_im2[i] = arr_im2[i].replace(/^ {3}/, "").replace(/$/, '</pre>')
    }
    // 始まって終わる
    else if (
      arr_status[i - 1]["class"] !== "pre"
      &&
      arr_status[i + 1]["class"] !== "pre"
    ) {
      arr_im2[i] = arr_im2[i].replace(/^ {3}/, '<pre>').replace(/$/, '</pre>')
    }
    // 勘案漏れ
    else {
    }
    return true
  }
  async function table(i) {
    let arr_table = []
    let j = 0
    let reg_w = RegExp(/ ?\| ?/)
    let sepPos = 0
    let table = ""
    let textAlign = []
    while (arr_status[i + j]["class"] === "table") {
      arr_table[j] = {}
      j++
    }
    for (let k = 0; k < j; k++) {
      arr_table[k]["item"] = arr_im2[i + k].split(reg_w).slice(1).slice(0, -1)
      if (arr_im2[i + k].match(/^\|( ?:?-+:? ?\|)+$/)) {
        sepPos = k
      }
      arr_im2[i + k] = ""
    }
    for (let k = 0; k < arr_table[sepPos]["item"].length; k++) {
      if (arr_table[sepPos]["item"][k].match(/ ?-+ ?/)) {
        textAlign[k] = ''
      }
      if (arr_table[sepPos]["item"][k].match(/ ?:-+ ?/)) {
        textAlign[k] = ' align="left"'
      }
      if (arr_table[sepPos]["item"][k].match(/ ?-+: ?/)) {
        textAlign[k] = ' align="right"'
      }
      if (arr_table[sepPos]["item"][k].match(/ ?:-+: ?/)) {
        textAlign[k] = ' align="center"'
      }
    }
    table += '<table>\n'
    if (sepPos > 0) {
      table += '<thead>\n'
    }
    for (let k = 0; k < sepPos; k++) {
      table += '<tr>'
      for (let l = 0; l < arr_table[k]["item"].length; l++) {
        table += `<td${textAlign[l]}>${arr_table[k]["item"][l]}</td>`
      }
      table += '</tr>\n'
    }
    if (sepPos > 0) {
      table += '</thead>\n'
    }
    table += '<tbody>\n'
    for (let k = sepPos + 1; k < j; k++) {
      table += '<tr>'
      for (let l = 0; l < arr_table[k]["item"].length; l++) {
        table += `<td${textAlign[l]}>${arr_table[k]["item"][l]}</td>`
      }
      table += '</tr>\n'
    }
    table += '</dbody>\n'
    table += '</table>'
    arr_im2[i] = table
    return i + j - 1
  }
  async function markupInline(i) {
    for (let i = 0; i < len; i++) {
      arr_im2[i] = arr_im2[i]
      .replace(/\*{3}(.+?)\*{3}/gm, '<strong><em>$1</em></strong>')
      .replace(/_{3}(.+?)_{3}/gm, '<strong><em>$1</em></strong>')
      .replace(/\*{2}(.+?)\*{2}/gm, '<strong>$1</strong>')
      .replace(/_{2}(.+?)_{2}/gm, '<strong>$1</strong>')
      .replace(/\*{1}([^ *][^*]*)\*{1}/gm, '<em>$1</em>')
      .replace(/_{1}([^_]+)_{1}/gm, '<em>$1</em>')
      .replace(/~{2}(.*?)~{2}/gm, '<s>$1</s>')
      .replace(/`{1}([^`]+)`{1}/gm, '<code>$1</code>')
      .replace(/\[(.*?)\]\((.*?)\)/gm, '<a href="$2">$1</a>')
      .replace(/!\[(.*?)\]\((.*?)( "(.*?)")?\)/gm, '<img src="$2" alt="$1" name="$4">')
      .replace(/^([ \t]*(\*|\+|-) )\[ ?\](.*)$/gm, '<label><input type="checkbox">$3</label>')
      .replace(/^([ \t]*(\*|\+|-) )\[[xX]\](.*)$/gm, '<label><input type="checkbox" checked>$3</label>')
      .replace(/^[ \t]*(\*[ \t]*){3,}$/gm, '<hr>')
      .replace(/^[ \t]*(-[ \t]*){3,}$/gm, '<hr>')
    }
    return arr_im2
  }
}