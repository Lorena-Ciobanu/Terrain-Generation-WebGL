
class FractalTerrainGenerator{

  constructor(dimension){
      this.outOfBounds = -1;
      this.dimension = dimension;
      this.max = dimension - 1;

      this.data = this.create2DArray();
      
  }

  create2DArray(){
    let data = [];
    for(let x = 0; x < this.dimension; x++){
      data[x] = [];
      for(let y = 0; y < this.dimension; y++){
        data[x][y] = 0;
      }
    }
    return data;
  }

  get(x, y){
    if(x < 0 || x > this.max || y < 0 || y > this.max){
      return this.outOfBounds;
    } 

    return this.data[x][y];
  }

  set(x, y, value){
    this.data[x][y] = value;  //TODO check bounds 
  }

  setCorners(){
    this.set(0, 0, this.max / 2);
    this.set(this.max, 0, this.max / 2);
    this.set(this.max, this.max, this.max / 2);
    this.set(0, this.max, this.max / 2);
  }

  divide(size){
    const half = size / 2;
    const scale = this.roughness * size;

    if(half < 1) return;

    /* Square */
    for(let y = half; y < this.max; y += size){
      for(let x = half; x < this.max; x += size){
        this.square(x, y, half, Math.random() * scale * 2 - scale);
      }
    }

    /* Diamond */
    for(let y = 0; y <= this.max; y+= half){
      for(let x = (y + half) % size; x <= this.max; x +=size){
        this.diamond(x, y, half, Math.random() * scale * 2 - scale);
      }
    }

    this.divide(size / 2);
  }


  /* Square */
  square(x, y, size, offset){
    let avg = this.average([
      this.get(x - size, y - size),   // Top Left 
      this.get(x + size, y - size),   // Top Right
      this.get(x + size, y + size),   // Bottom Right
      this.get(x - size, y + size)    // Bottom Left
    ]);

    this.set(x, y, avg + offset);
  }

  /* Diamond */
  diamond(x, y, size, offset){
    let avg = this.average([
      this.get(x, y - size),          // Top
      this.get(x + size, y),          // Right
      this.get(x, y + size),          // Bottom
      this.get(x - size, y)           // Left
    ]);

    this.set(x, y, avg + offset);
  }

  /* Average */
  average(values){
    let valid = values.filter((val) => {
      return val !== this.outOfBounds;
    });

    var total = valid.reduce((sum, value) =>{
      return sum + value
    }, 0);

    return total / valid.length;
  }

  /* Transform into objects to be parsed into geometry */
  parseData(data){
    let dataArr = [];

    for(let x = 0; x < data.length; x++){
        dataArr[x] = [];

        for(let y = 0; y < data.length; y++){
            dataArr[x][y] = {x: x, y: y, z: data[x][y]};
        }
    }

    return dataArr;
  }

  /* Main Generate function */
  generate(roughness){
    this.roughness = roughness;
    this.setCorners();
    this.divide(this.max);

    return this.parseData(this.data);
  }

}