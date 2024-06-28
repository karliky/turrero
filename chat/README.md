# Install and test the chat

First install all python dependencies in the localhost using `requirements.text`.


```bash
curl -fsSL https://ollama.com/install.sh | sh
ollama pull llama3
pip install -r requirements.txt
```
The system expects you to have ollama running on `localhost:11434` and that you already installed `llama3` but you may want to tinker as you wish.

To run the chat demo:

```bash
streamlit run app.py
```


# Run the jupyter notebook to experiment
```
chroma run --path db
jupyter lab 
```


# Troubleshooting

If there is a bug with chroma that says `Chroma getOrCreateCollection error: Error: AttributeError("type object 'CreateCollection' has no attribute 'model_validate'"`, upgrade pydantic:

```bash
pip install pydantic --upgrade
```