import { useState } from 'react';

const EditGameForm = ({ setToggleEditForm, game, editGame }) => {
    const [name, setName] = useState(game.name)
    const [gameIsPublic, setGameIsPublic] = useState(game.public)
    const [description, setDescription] = useState(game.description);

    const handleSubmit = (e) => {
        e.preventDefault();
        editGame({
            name,
            gameIsPublic,
            hash: game.hash,
            description
        });
    }

    return (
        <form onSubmit={e => handleSubmit(e)}>
            <div className="form-group">
                <div className="form-check">
                    <input onChange={(e) => setGameIsPublic(true)} name="gameIsPublic" value="true" type="radio" className="form-check-input" 
                    checked={gameIsPublic}/>
                    <label className="form-check-label">Public</label>
                </div>
                <div className="form-check">
                    <input onChange={(e) => setGameIsPublic(false)} name="gameIsPublic" value="false" type="radio" className="form-check-input" 
                    checked={!gameIsPublic}/>
                    <label className="form-check-label">Private</label>
                </div>
            </div>
            <div className="form-group">
                <label>Name</label>
                <input
                    className="form-control"
                    name="name"
                    type="text" 
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                />
            </div>
            <div className="form-group">
                <label>Description</label>
                <textarea
                    className="form-control"
                    rows="3"
                    onChange={(e) => setDescription(e.target.value)}
                    defaultValue={description}
                ></textarea>
            </div>
            <button type="submit" className="btn btn-primary">Save</button>
            <button className="btn btn-link"
                onClick={() => { setToggleEditForm(false) }}
            >Cancel</button>
        </form>
    );
}

export default EditGameForm
