import { React, useState, useRef, useEffect } from "react";
const algoliasearch = require('algoliasearch');

const client = algoliasearch('WU4KEG8DAS', '7bd2f67692c4d35a0c9a5d7e005deb1e');
const index = client.initIndex('turras');

function List(props) {
    return props.data.map((item) => (
        <div
            className="search-item"
            key={item.id} dangerouslySetInnerHTML={{ __html: item._highlightResult.tweet.value }}
            onClick={() => window.location.href = "/turra/" + item.id.split("-")[0] + "#" + item.id.split("-")[1]}
        ></div>
    ));
}

function Search() {
    const [inputText, setInputText] = useState("");
    const [data, setData] = useState([]);
    const resultsRef = useRef(null);
    const clearRef = useRef(null);
    const debounceRef = useRef();
    const DEBOUNCE_MIN_MS = 300;

    const onSearch = (searchValue) => {
        if (searchValue === "") {
            resultsRef.current.style.display = 'none';
            clearRef.current.style.display = 'none';
            return setData([]);
        }
        resultsRef.current.style.display = 'block';
        clearRef.current.style.display = 'block';
        index.search(searchValue).then(({ hits }) => {
            setData(hits);
        });
    };

    const onSearchDebounce = (e) => {
        var searchValue = e.target.value.toLowerCase();
        setInputText(searchValue);
        if (debounceRef.current) clearTimeout(debounceRef.current);
        debounceRef.current = (setTimeout(() => onSearch(searchValue), DEBOUNCE_MIN_MS));
    }

    const clearSearch = () => {
        setInputText("");
        resultsRef.current.style.display = 'none';
        clearRef.current.style.display = 'none';
        setData([]);
    };

    const handleClearKey = (e) => {
        if (e.key === "Enter") {
            clearSearch();
        }
    }

    useEffect(() => {
        document.addEventListener("click", (e) => {
            document.querySelector(".results").style.display = "none";
        });
      }, []);

    return (
        <div className="search">
            <div>
                <input className="search-field" type="text" value={inputText} onChange={onSearchDebounce} placeholder="Buscar turras..." />
                <div className="clear-icon" ref={clearRef} onClick={clearSearch} onKeyDown={handleClearKey} tabIndex="0">
                    <svg viewBox="0 0 14 14" className="h-8"><path d="M8.41,7l5.3-5.29A1,1,0,1,0,12.29.29L7,5.59,1.71.29A1,1,0,0,0,.29,1.71L5.59,7,.29,12.29a1,1,0,0,0,0,1.42,1,1,0,0,0,1.42,0L7,8.41l5.29,5.3a1,1,0,0,0,1.42,0,1,1,0,0,0,0-1.42Z"></path></svg>
                </div>
            </div>

            <div className="results" ref={resultsRef}>
                <List input={inputText} data={data} />
            </div>

            <style jsx global>
                {`
            .search {
                font-size: 1em;
                position: relative;
                margin-top: 20px;
            }
            em {
                background-color: #a5050b;
                color: white;
            }
            .clear-icon {
                position: absolute;
                width: 10px;
                right: 12px;
                top: 12px;
                fill: #c5cbd5;
                display: none;
            }
            .clear-icon:hover, .clear-icon:focus {
                cursor: pointer;
                fill: black;
            }
            .results {
                position: absolute;
                width: 100%;
                background-color: #fff;
                border: 1px solid #e5e7eb;
                z-index: 1;
                display: none;
                border-top: none;
                max-height: 400px;
                overflow-y: auto;
                box-shadow: 0 5px 5px rgb(0 0 0 / 3%), 0 2px 2px rgb(0 0 0 / 3%), 0 0 1px rgb(0 0 0 / 3%);
            }

            .results::-webkit-scrollbar-track
            {
              
            }

            .results::-webkit-scrollbar
            {
                width: 6px;
                background-color: #F5F5F5;
            }

            .results::-webkit-scrollbar-thumb
            {
                background-color: #C5CBD5;
            }

            .search-field:focus-visible {
                outline: none;
            }
            .search-field {
                font-size: 16px;
                line-height: 1.5;
                border: none;
                background-color: rgba(255, 255, 255, 0.6);
                background-image: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 16 16'><path fill='%238C92A0' d='M11.44 10.73l4.41 4.42a.5.5 0 1 1-.7.7l-4.42-4.41a6.5 6.5 0 1 1 .7-.7v-.01zM6.5 12a5.5 5.5 0 1 0 0-11 5.5 5.5 0 0 0 0 11z'></path></svg>");
                background-repeat: no-repeat;
                background-position: 9px 9px;
                background-size: 20px 20px;
                border-bottom: 1px solid #C5CBD5;
                width: 100%;
                padding: 0.5em 1em 0.5em 2.5em;
                color: #191817;
            }
            .search-field::placeholder {
                color: #8c92a0;
                font-size: 14px;
                line-height: 20px;
            }
            .search-item {
                padding: 10px;
                border-bottom: 1px solid #eee;
                font-size: 13px;
                line-height: 16px;
                color: #757575;
                text-align: initial;
                text-overflow: ellipsis;
            }
            .search-item:hover {
                background-color: #5A9FC7;
                color: #fff;
                cursor: pointer;
            }
`}
            </style>
        </div>
    );
}

export default Search;