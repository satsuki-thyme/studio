let work = []
let counter = 0
for (let i in array) {
  omotai(array[i])
  .then(relay => {
    work[i] = relay
    if (counter >= array.length - 1) {
      console.log(work.join(""))
    }
    counter++
  })
}
