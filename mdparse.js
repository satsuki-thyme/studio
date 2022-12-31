async function mdParse(src) {
  let accum = []
  let fnCnt = []
  let arrowIcon = 
`<svg class="user-cnt-arrow" version="1.1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0, 0, 16, 21">
<path d="M 0,0 V 2 h 8 c 3,0 6,3 6,6 0,3 -3,6 -6,6 H 7 v 2 h 1 c 4,0 8,-4 8,-8 0,-4 -4,-8 -8,-8 z"/>
<path d="M 6,21 7,19 3,15 7,11 6,9 0,15 Z"/>
</svg>`
  return new Promise(resolve => {
    markupBlock(
      classify(
        src
        .replace(/ {2}$/gm, "<br>")
        .split(/\r?\n/)
      )
    )
    .then(rly => {
      let work = []
      for (let i in rly[0]) {
        work.push([rly[0][i], rly[1][i]])
      }
      console.log(work)
      return markupInline(rly)
    })
    .then(rly => {
      resolve(procFn(rly))
    })
  })
  function classify(work) {
    let prop = []
    let tProp = []
    let rowNumAttach = 0
    let preEnclContinuation = false
    for (let i = 0; i < work.length; i++) {
      prop[i] = {}
      let indentElm = work[i].match(/^(?:\t| {4})+/)
      if (indentElm === null) {
        prop[i].indent = 0
      }
      else {
        prop[i].indent = indentElm[0].match(/\t| {4}/g).length
      }
      /*
        table of if
        1. blank
        2. h
        3. p
        4. li with ul as parent
        5. li with ol as parent
        6. blockquote
        7. pre with enclosing
        8. pre therefore enclosing
        9. pre with indentation
        10. table
        11. footnote
      */
      // blank
      if (
        preEnclContinuation === false
        &&
        work[i].match(/^$/) !== null
      ) {
        prop[i].class = "blank"
      }
      // h
      if (
        preEnclContinuation === false
        &&
        work[i].match(/^#{1,6} /) !== null
      ) {
        prop[i].class = "h"
      }
      // p
      if (
        preEnclContinuation === false
        &&
        work[i].match(/^(?!(#{1,6}|\*|\+|-|\d+\.) |>+ |[`~]{3}|\t| {4}|\||\[\^.+?\]: ?).+/) !== null
      ) {
        prop[i].class = "p"
      }
      // li with ul as parent
      if (
        preEnclContinuation === false
        &&
        work[i].match(/^(?:\t| {4})*[*+-] (?!\[[ x]\] )/) !== null
        &&
        (
          (
            i === 0
            &&
            prop[i].indent === 0
          )
          ||
          (
            i > 0
            &&
            (
              (
                prop[i - 1].class === "li"
                &&
                prop[i].indent - prop[i - 1].indent <= 1
              )
              ||
              (
                prop[i - 1].class !== "li"
                &&
                prop[i].indent === 0
              )
            )
          )
        )
      ) {
        prop[i].class = "li"
        prop[i].parent = "ul"
        prop[i].task = false
      }
      // li with ol as parent
      if (
        preEnclContinuation === false
        &&
        work[i].match(/^(?:\t| {4})*\d+\. /) !== null
        &&
        (
          (
            i === 0
            &&
            prop[i].indent === 0
          )
          ||
          (
            i > 0
            &&
            (
              (
                prop[i - 1].class === "li"
                &&
                prop[i].indent - prop[i - 1].indent <= 1
              )
              ||
              (
                prop[i - 1].class !== "li"
                &&
                prop[i].indent === 0
              )
            )
          )
        )
      ) {
        prop[i].class = "li"
        prop[i].parent = "ol"
        prop[i].task = false
      }
      // task list
      if (
        preEnclContinuation === false
        &&
        work[i].match(/^(?:\t| {4})*[*+-] \[[ x]\] /) !== null
        &&
        (
          (
            i === 0
            &&
            prop[i].indent === 0
          )
          ||
          (
            i > 0
            &&
            (
              (
                prop[i - 1].class === "li"
                &&
                prop[i].indent - prop[i - 1].indent <= 1
              )
              ||
              (
                prop[i - 1].class !== "li"
                &&
                prop[i].indent === 0
              )
            )
          )
        )
      ) {
        prop[i].class = "li"
        prop[i].parent = "ul"
        prop[i].task = true
      }
      // blockquote
      if (
        preEnclContinuation === false
        &&
        work[i].match(/^>+ /) !== null
      ) {
        prop[i].class = "bq"
        prop[i].stack = work[i].match(/^>+/)[0].match(/>/g).length
      }
      // pre with enclosing
      if (
        work[i].match(/^[`~]{3}/) !== null
      ) {
        prop[i].class = "preEncl"
        prop[i].site = "end"
        if (preEnclContinuation === false) {
          preEnclContinuation = true
          prop[i].preId = i
        }
        else {
          preEnclContinuation = false
        }
      }
      // pre therefore enclosing
      if (
        preEnclContinuation === true
        &&
        work[i].match(/^[`~]{3}/) === null
      ) {
        prop[i].class = "preEncl"
        prop[i].site = "middle"
        prop[i].preId = prop[i - 1].preId
      }
      // pre with indentation
      if (
        preEnclContinuation === false
        &&
        work[i].match(/^(?:\t| {4})+(?!(\*|\+|-|\d+\.) |\t| {4})/) !== null
      ) {
        prop[i].class = "preInd"
      }
      // table
      if (
        preEnclContinuation === false
        &&
        work[i].match(/^\|/) !== null
      ) {
        prop[i].class = "table"
        let hLine = false
        if (work[i].match(/^(?:\| ?:?-+:? ?)+\|/) !== null) {
          hLine = true
        }
        if (
          i > 0
          &&
          prop[i - 1].class === "table"
        ) {
          prop[i].tId = prop[i - 1].tId
          if (hLine === false) {
            rowNumAttach++
            prop[i].rowNum = rowNumAttach
          }
        }
        else {
          tProp.push({}) 
          prop[i].tId = tProp.length - 1
          tProp[prop[i].tId].hLineAlready = false
          tProp[prop[i].tId].hLinePosition = 0
          if (hLine === false) {
            rowNumAttach = 0
            prop[i].rowNum = 0
          }
        }
        if (hLine === false) {
          prop[i].hLine = false
        }
        else {
          prop[i].hLine = true
          if (tProp[prop[i].tId].hLineAlready === false) {
            tProp[prop[i].tId].hLineAlready = true
            let align = setAlign(work[i])
            tProp[prop[i].tId].align = `class="user-cnt-table-${align}" align="${align}"`
            if (
              i === 0
              ||
              prop[i - 1].class !== "table"
            ) {
              tProp[prop[i].tId].hLinePosition = 0
            }
            else {
              tProp[prop[i].tId].hLinePosition = prop[i - 1].rowNum + 1
            }
          }
        }
      }
      if (
        preEnclContinuation === false
        &&
        work[i].match(/\[.+?\]: /) !== null
      ) {
        prop[i].class = "footnote"
      }
    }
    return [work, prop, tProp]
  }
  async function markupBlock(rly) {
    let work = rly[0]
    let prop = rly[1]
    let tProp = rly[2]
    let i = 0
    return new Promise(resolve => {
      fn()
      function fn() {
        if (prop[i].class === "blank") {
          if (i < prop.length - 1) {
            i++
            fn()
          }
          else {
            resolve([work, prop])
          }
        }
        else if (prop[i].class === "h") {
          work[i] = h(work, i)
          if (i < prop.length - 1) {
            i++
            fn()
          }
          else {
            resolve([work, prop])
          }
        }
        else if (prop[i].class === "p") {
          if (
            i === prop.length - 1
            ||
            prop[i + 1].class !== "p"
          ) {
            work[i] = `<p>${work[i]}</p>\n`
            if (i < prop.length - 1) {
              i++
              fn()
            }
            else {
              resolve([work, prop])
            }
          }
          else {
            work[i + 1] = `${work[i]}${pConcat(work[i])}${work[i + 1]}`
            work = work.slice(0, i).concat(work.slice(i + 1))
            prop = prop.slice(0, i).concat(prop.slice(i + 1))
            if (i < prop.length - 1) {
              fn()
            }
            else {
              resolve([work, prop])
            }
          }
        }
        else if (prop[i].class === "li") {
          work[i] = li(work, prop, i)
          if (i < prop.length - 1) {
            i++
            fn()
          }
          else {
            resolve([work, prop])
          }
        }
        else if (prop[i].class === "bq") {
          work[i] = bq(work, prop, i)
          if (i < prop.length - 1) {
            i++
            fn()
          }
          else {
            resolve([work, prop])
          }
        }
        else if (prop[i].class === "preEncl") {
          if (prop[i].site === "middle") {
            preEncl(work, prop, i)
            .then(rly => {
              work[i] = rly
              if (i < prop.length - 1) {
                i++
                fn()
              }
              else {
                resolve([work, prop])
              }
            })
          }
          else {
            work = work.slice(0, i).concat(work.slice(i + 1))
            prop = prop.slice(0, i).concat(prop.slice(i + 1))
            if (i < prop.length - 1) {
              fn()
            }
            else {
              resolve([work, prop])
            }
          }
        }
        else if (prop[i].class === "preInd") {
          work[i] = preInd(work, prop, i)
          if (i < prop.length - 1) {
            i++
            fn()
          }
          else {
            resolve([work, prop])
          }
        }
        else if (prop[i].class === "table") {
          if (prop[i].hLine === false) {
            table(work, prop, tProp, i)
            .then(rly => {
              work[i] = rly
              if (i < prop.length - 1) {
                i++
                fn()
              }
              else {
                resolve([work, prop])
              }
            })
          }
          else {
            work = work.slice(0, i).concat(work.slice(i + 1))
            prop = prop.slice(0, i).concat(prop.slice(i + 1))
            if (i < prop.length - 1) {
              fn()
            }
            else {
              resolve([work, prop])
            }
          }
        }
        else if (prop[i].class === "footnote") {
          fnCnt.push(
            {
              "key": work[i].match(/(?<=\[\^).+?(?=\]: )/)[0],
              "word": work[i].replace(/\[\^.+?\]: /, "")
            }
          )
          work = work.slice(0, i).concat(work.slice(i + 1))
          prop = prop.slice(0, i).concat(prop.slice(i + 1))
          if (i < prop.length - 1) {
            fn()
          }
          else {
            resolve([work, prop])
          }
        }
      }
    })
  }
  async function markupInline(rly) {
    return rly[0].map(rly => {
      return rly
      .replace(/(?<!_)_([^_].*?)_(?!_)/g, "<em>$1</em>")
      .replace(/(?<!_)__([^_].*?)__(?!_)/g, "<strong>$1</strong>")
      .replace(/___(.+?)___/g, "<strong><em>$1</em></strong>")
      .replace(/(?<!\*)\*([^*].*?)\*(?!\*)/g, "<em>$1</em>")
      .replace(/(?<!\*)\*\*([^*].*?)\*\*(?!\*)/g, "<strong>$1</strong>")
      .replace(/\*\*\*(.+?)\*\*\*/g, "<strong><em>$1</em></strong>")
      .replace(/(?<!~)~~(.+?)~~(?!~)/g, "<del>$1</del>")
      .replace(/`(.+?)`/g, "<code>$1</code>")
      .replace(/(?<!!)\[([^\]]+?)\]\((.+?)\)/g, `<a href="$2">$1</a>`)
      .replace(/!\[([^\]]+?)\]\((.+?)\)/g, `<img src="$2" alt="$1">`)
      .replace(/\\()/g, "")
    })
  }
  async function procFn(rly) {
    let work = rly.join("")
    let fnKey = fnKeyPick(work)
    let fnKeyUniq = Array.from(new Set(fnKey))
    let fnCntSort = procFnCntSort()
    let fnCntSortUniq = []
    for (let i in fnCntSort) {
      fnCntSortUniq.push(fnCntSort[i].key)
    }
    fnCntSortUniq = Array.from(new Set(fnCntSortUniq))
    let arrow = makeArrow()
    return makeFnKey(work) + makeFnCnt()
    function makeFnKey(rly) {
      let work = rly
      let j = 0
      for (let i = 0; i < fnKey.length; i++) {
        let rx_fnKey = new RegExp(`\\[\\^${fnKey[i]}\\]`)
        for (let j = 0; j < fnCntSortUniq.length; j++) {
          if (fnKey[i] === fnCntSortUniq[j]) {
            work = work.replace(rx_fnKey, `<sup>[<a id="user-cnt-funref-${i}" href="#user-cnt-fun-${j}">${j + 1}</a>]</sup>`)
          }
        }
      }
      return work
    }
    function procFnCntSort() {
      let work = []
      for (let i in fnKeyUniq) {
        for (let j = 0; j < fnCnt.length; j++) {
          if (fnKeyUniq[i] === fnCnt[j].key) {
            work.push(fnCnt[j])
            fnCnt = fnCnt.slice(0, j).concat(fnCnt.slice(j + 1))
          }
        }
      }
      for (let i in fnCnt) {
        work.push(fnCnt[i])
      }
      return work
    }
    function fnKeyPick(rly) {
      let work = []
      let work1 = rly.match(/\[\^.+?\]/g)
      if (work1 !== null) {
        for (let i in work1) {
          work.push(work1[i].replace(/\[\^|\]/g, ""))
        }
      }
      return work
    }
    function makeFnCnt() {
      let work = []
      work.push(`<section class="footnotes">\n<ol>\n`)
      for (let i in fnCntSort) {
        work.push(`<li id="user-cnt-fun-${i}"><p>${fnCntSort[i].word.replace(/^\[[^\]]+\]: /g, "")}${arrow[i].join("")}</p></li>\n`)
      }
      work.push("</ol>\n</section>")
      return work.join("")
    }
    function makeArrow() {
      let work = []
      for (let i in fnCntSort) {
        work[i] = []
        for (let j in fnKey) {
          if (fnCntSort[i].key === fnKey[j]) {
            work[i].push(` <a href="#user-cnt-funref-${j}">${arrowIcon}</a>`)
          }
        }
      }
      return work
    }
  }
  function h(work, i) {
    let num = work[i].match(/^#+/)[0].match(/#/g).length
    return `<h${num}>${work[i].replace(/^#+ /, "")}</h${num}>`
  }
  function pConcat(src) {
    if (src.match(/<br>$/) === null) {
      return " "
    }
    else {
      return ""
    }
  }
  function li(work, prop, i) {
    /*
      table of if
      the li...
      1. continues
      2. begins, not ends
      3. ends, not begins
      4. begins and ends
    */
    // the li continues
    if (
      i > 0
      &&
      i < prop.length - 1
      &&
      prop[i - 1].class === "li"
      &&
      (
        prop[i].indent < prop[i - 1].indent
        ||
        (
          prop[i].indent === prop[i - 1].indent
          &&
          prop[i].parent === prop[i - 1].parent
        )
      )
      &&
      prop[i + 1].class === "li"
      &&
      (
        prop[i].indent < prop[i + 1].indent
        ||
        (
          prop[i].indent === prop[i + 1].indent
          &&
          prop[i].parent === prop[i + 1].parent
        )
      )
    ) {
      return `${liBegin(work, prop, i)}${work[i].replace(/^[\t ]*([*+-]|\d+\.) (\[[ x]\] )?/, "")}</li>`
    }
    // the li begins, not ends
    if (
      (
        i === 0
        ||
        prop[i - 1].class !== "li"
        ||
        prop[i].indent > prop[i - 1].indent
        ||
        (
          prop[i].indent === prop[i - 1].indent
          &&
          prop[i].parent !== prop[i - 1].parent
        )
      )
      &&
      i < prop.length - 1
      &&
      prop[i + 1].class === "li"
      &&
      (
        prop[i].indent < prop[i + 1].indent
        ||
        (
          prop[i].indent === prop[i + 1].indent
          &&
          prop[i].parent === prop[i + 1].parent
        )
      )
    ) {
      accum.push(prop[i].parent)
      return `<${prop[i].parent}>\n${liBegin(work, prop, i)}${work[i].replace(/^[\t ]*([*+-]|\d+\.) (\[[ x]\] )?/, "")}</li>`
    }
    // the li ends, not begins
    if (
      (
        i === prop.length - 1
        ||
        prop[i + 1].class !== "li"
        ||
        prop[i].indent > prop[i + 1].indent
        ||
        (
          prop[i].indent === prop[i + 1].indent
          &&
          prop[i].parent !== prop[i + 1].parent
        )
      )
      &&
      i !== 0
      &&
      prop[i - 1].class === "li"
      &&
      (
        prop[i].indent < prop[i - 1].indent
        ||
        (
          prop[i].indent === prop[i - 1].indent
          &&
          prop[i].parent === prop[i - 1].parent
        )
      )
    ) {
      return `${liBegin(work, prop, i)}${work[i].replace(/^[\t ]*([*+-]|\d+\.) (\[[ x]\] )?/, "")}</li>\n${liEnd(prop, i)}`
    }
    // the li begins and ends
    if (
      (
        i === 0
        ||
        prop[i - 1].class !== "li"
        ||
        prop[i].indent > prop[i - 1].indent
        ||
        (
          prop[i].indent === prop[i - 1].indent
          &&
          prop[i].parent !== prop[i - 1].parent
        )
      )
      &&
      (
        i === prop.length - 1
        ||
        prop[i + 1].class !== "li"
        ||
        prop[i].indent > prop[i + 1].indent
        ||
        (
          prop[i].indent === prop[i + 1].indent
          &&
          prop[i].parent !== prop[i + 1].parent
        )
      )
    ) {
      accum.push(prop[i].parent)
      return `<${prop[i].parent}>\n${liBegin(work, prop, i)}${work[i].replace(/^[\t ]*([*+-]|\d+\.) (\[[ x]\] )?/, "")}</li>\n${liEnd(prop, i)}`
    }
  }
  function liBegin(work, prop, i) {
    if (prop[i].task === false) {
      return `<li>`
    }
    else if (work[i].match(/^.*\[ \]/) !== null) {
      return `<li class="user-cnt-tasklist"><input type="checkbox"> `
    }
    else {
      return `<li class="user-cnt-tasklist"><input type="checkbox" checked> `
    }
  }
  function liEnd(prop, i) {
    let ter = ""
    /*
      table of if
      1. the li all ends
      2. the nested li ends, the parent li continues
      3. the different types (ol, ul) of li ends
    */
    // the li all ends
    if (
      i === prop.length - 1
      ||
      prop[i + 1].class !== "li"
    ) {
      ter = `</${accum.reverse().join(">\n</")}>\n`
      accum = []
      return ter
    }
    // the nested li ends, the parent li continues
    if (
      i < prop.length - 1
      &&
      prop[i + 1].class === "li"
      &&
      prop[i].indent > prop[i + 1].indent
    ) {
      let dif = prop[i + 1].indent - prop[i].indent
      ter = `</${accum.slice(dif).reverse().join(">\n</")}>\n`
      accum = accum.slice(0, accum.length + dif)
      return ter
    }
    // the different types (ol, ul) of li ends
    if (
      i < prop.length - 1
      &&
      prop[i + 1].class === "li"
      &&
      prop[i].indent === prop[i + 1].indent
      &&
      prop[i].parent !== prop[i + 1].parent
    ) {
      ter = `</${accum.slice(-1)}>\n`
      accum = accum.slice(0, accum.length - 1)
      return ter
    }
  }
  function bq(work, prop, i) {
    /*
      table of if
      the blockquote...
      1. continues
      2. begins, not ends
      3. ends, not begins
      4. begins and ends
    */
    // the blockquote continues
    if (
      i > 0
      &&
      i < prop.length - 1
      &&
      prop[i].stack <= prop[i - 1].stack
      &&
      prop[i].stack <= prop[i + 1].stack
    ) {
      return work[i].replace(/^>+ /, "")
    }
    // the blockquote begins, not ends
    else if (
      (
        i === 0
        ||
        prop[i - 1].class !== "bq"
        ||
        prop[i].stack > prop[i - 1].stack
      )
      &&
      i < prop.length - 1
      &&
      prop[i + 1].class === "bq"
    ) {
      let bqBegin = ""
      if (prop[i - 1].class !== "bq") {
        bqBegin = "\n<blockquote>".repeat(prop[i].stack).replace(/^\n/, "")
      }
      else {
        bqBegin = "\n<blockquote>".repeat(prop[i].stack - prop[i - 1].stack).replace(/^\n/, "")
      }
        return `${bqBegin}${work[i].replace(/^>+ /, "")}`
    }
    // the blockquote ends, not begins
    else if (
      (
        i === prop.length - 1
        ||
        prop[i + 1].class !== "bq"
        ||
        prop[i].stack > prop[i + 1].stack
      )
      &&
      i > 0
      &&
      prop[i - 1].class === "bq"
    ) {
      let bqEnd = ""
      if (prop[i + 1].class !== "bq") {
        bqEnd = "</blockquote>\n".repeat(prop[i].stack).replace(/\n$/, "")
      }
      else {
        bqEnd = "</blockquote>\n".repeat(prop[i].stack - prop[i + 1].stack).replace(/\n$/, "")
      }
        return `${work[i].replace(/^>+ /, "")}${bqEnd}`
    }
  }
  async function preEncl(work, prop, i) {
    /*
      table of if
      the pre...
      1. continues
      2. begins, not ends
      3. ends, not begins
      4. begins and ends
    */
    // the pre continues
    if (
      i > 0
      &&
      prop[i - 1].class === "preEncl"
      &&
      prop[i - 1].preId === prop[i].preId
      &&
      i < prop.length - 1
      &&
      prop[i + 1].class === "preEncl"
      &&
      prop[i + 1].preId === prop[i].preId
    ) {
      return work[i]
    }
    // the pre begins, not ends
    if (
      (
        i === 0
        ||
        prop[i - 1].class !== "preEncl"
        ||
        prop[i - 1].preId !== prop[i].preId
      )
      &&
      i < prop.length - 1
      &&
      prop[i + 1] === "preEncl"
      &&
      prop[i + 1].preId === prop[i].preId
    ) {
      return `<pre><code>${work[i]}`
    }
    // the pre ends, not begins
    if (
      (
        i === prop.length - 1
        ||
        prop[i + 1].class !== "preEncl"
        ||
        prop[i + 1].preId !== prop[i].preId
      )
      &&
      i > 0
      &&
      prop[i - 1].class === "preEncl"
      &&
      prop[i - 1].preId === prop[i].preId
    ) {
      return `${work[i]}</code></pre>\n`
    }
    // the pre begins and ends
    if (
      (
        i === 0
        ||
        prop[i - 1].class !== "preEncl"
        ||
        prop[i - 1].preId !== prop[i].preId
      )
      &&
      (
        i === prop.length - 1
        ||
        prop[i + 1].class !== "preEncl"
        ||
        prop[i + 1].preId !== prop[i].preId
      )
    ) {
      return `<pre><code>${work[i]}</code></pre>\n`
    }
  }
  function preInd(work, prop, i) {
    /*
      table of if
      the pre...
      1. continues
      2. begins, not ends
      3. ends, not begins
      4. begins, not ends
    */
    // the pre continues
    if (
      i > 0
      &&
      prop[i - 1].class === "preInd"
      &&
      i < prop.length - 1
      &&
      prop[i + 1].class === "preInd"
    ) {
      return work[i].replace(/^\t|^ {4}/, "")
    }
    // the pre begins, not ends
    else if (
      i === 0
      ||
      (
        prop[i - 1].class !== "preInd"
        &&
        i < prop.length - 1
        &&
        prop[i + 1].class === "preInd"
      )
    ) {
      return `<pre><code>${work[i].replace(/^\t|^ {4}/, "")}`
    }
    // the pre ends, not begins
    else if (
      i === prop.length - 1
      ||
      (
        prop[i + 1].class !== "preInd"
        &&
        i > 0
        &&
        prop[i - 1].class === "preInd"
      )
    ) {
      return `${work[i].replace(/^\t|^ {4}/, "")}</code></pre>\n`
    }
    // the pre begins and ends
    else if (
      (
        i === 0
        ||
        prop[i - 1].class !== "preInd"
      )
      &&
      (
        i === prop.length - 1
        ||
        prop[i + 1].class !== "preInd"
      )
    ) {
      return `<pre><code>${work[i].replace(/^\t|^ {4}/, "")}</code></pre>\n`
    }
  }
  async function table(work, prop, tProp, i) {
    /*
      table of if
      the table...
      1. continues
      2. begins, not ends
      3. ends, not begins
      4. begins and ends
    */
    // the table continues
    if (
      i > 0
      &&
      prop[i - 1].class === "table"
      &&
      i < prop.length - 1
      &&
      prop[i + 1].class === "table"
    ) {
      if (tProp[prop[i].tId].hLinePosition === prop[i].rowNum + 1) {
        return `${trtd(work, prop, tProp, i)}</thead>\n`
      }
      if (tProp[prop[i].tId].hLinePosition === prop[i].rowNum) {
        return `<tbody>\n${trtd(work, prop, tProp, i)}`
      }
      if (
        tProp[prop[i].tId].hLinePosition !== prop[i].rowNum + 1
        &&
        tProp[prop[i].tId].hLinePosition !== prop[i].rowNum
      ) {
        return `${trtd(work, prop, tProp, i)}`
      }
    }
    // the table begins, not ends
    if (
      (
        i === 0
        ||
        prop[i - 1].class !== "table"
      )
      &&
      i < prop.length
      &&
      prop[i + 1].class === "table"
    ) {
      if (
        tProp[prop[i].tId].hLinePosition === 0
      ) {
        return `<table>\n<tbody>\n${trtd(work, prop, tProp, i)}`
      }
      if (
        tProp[prop[i].tId].hLinePosition === 1
      ) {
        return `<table>\n<thead>\n${trtd(work, prop, tProp, i)}</thead>\n`
      }
      if (
        tProp[prop[i].tId].hLinePosition > 1
      ) {
        return `<table>\n<thead>\n${trtd(work, prop, tProp, i)}`
      }
    }
    // the table ends, not begins
    if (
      (
        i === prop.length - 1
        ||
        prop[i + 1].class !== "table"
      )
      &&
      i > 0
      &&
      prop[i - 1].class === "table"
    ) {
      if (tProp[prop[i].tId].hLinePosition === prop[i].rowNum + 1) {
        return `${trtd(work, prop, tProp, i)}</thead>\n</table>\n`
      }
      if (tProp[prop[i].tId].hLinePosition === prop[i].rowNum) {
        return `<tbody>\n${trtd(work, prop, tProp, i)}</tbody>\n</table>\n`
      }
      if (
        tProp[prop[i].tId].hLinePosition !== prop[i].rowNum + 1
        &&
        tProp[prop[i].tId].hLinePosition !== prop[i].rowNum
      ) {
        return `${trtd(work, prop, tProp, i)}</tbody>\n</table>\n`
      }
    }
    // the table begins and ends
    if (
      (
        i === 0
        ||
        prop[i - 1].class !== "table"
      )
      &&
      (
        i === prop.length - 1
        ||
        prop[i + 1].class !== "table"
      )
    ) {
      if (tProp[prop[i].tId].hLinePosition === i - prop[i].tId + 1) {
        return `<table>\n<thead>\n${trtd(work, prop, tProp, i)}</thead>\n</table>\n`
      }
      if (tProp[prop[i].tId].hLinePosition === i - prop[i].tId) {
        return `<table>\n<tbody>\n${trtd(work, prop, tProp, i)}</tbody>\n</table>\n`
      }
    }
  }
  function setAlign(src) {
    let work = src.split("|")
    return work.splice(1, work.length - 2).map(rly => {
      if (rly.match(/^ ?:-+ ?$/) !== null) {
        return "left"
      }
      if (rly.match(/^ ?:-+: ?$/) !== null) {
        return "center"
      }
      if (rly.match(/^ ?-+: ?$/) !== null) {
        return "right"
      }
      if (rly.match(/^ ?-+ ?$/) !== null) {
        return ""
      }
    })
  }
  function trtd(work, prop, tProp, i) {
    let work1 = work[i].split(/[ \t]*(?<!\\)\|[ \t]*/)
    return "<tr>\n" + work1
    .splice(1, work1.length - 2)
    .map((rly, j) => {
      return `<td ${tProp[prop[i].tId].align[j]}>${rly}</td>\n`
    })
    .join("") + "</tr>\n"
  }
}
