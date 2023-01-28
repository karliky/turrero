import { React, useState } from "react";

function List(props) {
    const filteredData = props.data.filter((el) => {
        return el.tweet.toLowerCase().includes(props.input)
    })
    return (
        <ul>
            {filteredData.map((item) => (
                <li key={item.id}>{item.tweet}</li>
            ))}
        </ul>
    )
}


function Search() {
  const [inputText, setInputText] = useState("");
  const [data, setData] = useState([{
    id: 1,
    tweet: "Hello World"
  },
  {
    id: 2,
    tweet: "Bye World"
  }]);
  
  const onSearch = (e) => {
    var lowerCase = e.target.value.toLowerCase();
    setData(data);
    setInputText(lowerCase);
  };

  return (
    <div className="main">
      <h1>Search</h1>
      <div className="search">
        <input type="text" onChange={onSearch} />
      </div>
      <List input={inputText} data={data} />
    </div>
  );
}

export default Search;